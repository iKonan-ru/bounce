import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Check, ChevronDown, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AutosaveInput } from '@/components/autosave-input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { ImageViewer } from '@/components/image-viewer';
import { useFileUrl } from '@/components/images';
import { GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { PropRow } from '@/components/prop-row';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { fileSize } from '@/lib/format';
import { shrinkImage, warmImages } from '@/lib/images';
import {
  MANUAL_SONG_STATUSES,
  MAX_COVERS,
  MAX_IMAGE_BYTES,
  mainCover,
  SONG_STATUS_LABEL,
  type Song,
  songStatus,
} from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { songQuery } from '@/lib/queries';
import { sendRecordForm } from '@/lib/upload';
import { cn } from '@/lib/utils';

export function SongEditPage() {
  const { projectId, songId } = useParams({ from: '/app/p/$projectId/songs/$songId/edit' });
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);

  return (
    <>
      <PageHeader crumbs={crumbs} title="Настройки песни" />
      {song.isPending && <Skeleton className="h-60 rounded-xl" />}
      {song.data && (
        <div className="grid max-w-5xl items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <SongForm song={song.data} />
          <Covers song={song.data} />
          <DeleteSong projectId={projectId} song={song.data} />
        </div>
      )}
    </>
  );
}

// Поля сохраняются сами: при уходе из поля, выборе статуса или даты.
function SongForm({ song }: { song: Song }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (
      patch: Partial<Pick<Song, 'title' | 'status' | 'bpm' | 'key' | 'target_release'>>,
    ) => collection(pb, 'songs').update(song.id, patch),
    onSettled: () => client.invalidateQueries({ queryKey: ['songs'] }),
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  return (
    <Section title="Песня">
      <div className={GROUP_ROWS}>
        <PropRow label="Название">
          <AutosaveInput
            id="song-title"
            required
            maxLength={200}
            value={song.title}
            onSave={(title) => save.mutate({ title })}
          />
        </PropRow>
        <PropRow label="Статус">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="-mr-2 h-9 gap-1.5 px-2 font-normal">
                {SONG_STATUS_LABEL[songStatus(song)]}
                <ChevronDown className="size-4 text-dim" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {MANUAL_SONG_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => s !== song.status && save.mutate({ status: s })}
                >
                  <span className="flex-1">{SONG_STATUS_LABEL[s]}</span>
                  {s === song.status && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PropRow>
        <PropRow label="Темп, BPM">
          <AutosaveInput
            id="song-bpm"
            inputMode="numeric"
            placeholder="-"
            value={song.bpm ? String(song.bpm) : ''}
            normalize={(v) => v.replace(/\D/g, '')}
            validate={(v) => v === '' || (Number(v) >= 20 && Number(v) <= 400)}
            onSave={(v) => save.mutate({ bpm: v ? Number(v) : 0 })}
          />
        </PropRow>
        <PropRow label="Тональность">
          <AutosaveInput
            id="song-key"
            placeholder="-"
            maxLength={20}
            value={song.key ?? ''}
            onSave={(key) => save.mutate({ key })}
          />
        </PropRow>
      </div>
    </Section>
  );
}

function Covers({ song }: { song: Song }) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const input = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const covers = song.covers ?? [];
  const main = mainCover(song);
  const refresh = () => client.invalidateQueries({ queryKey: ['songs'] });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      setProgress(0);
      const small = await Promise.all(files.map((f) => shrinkImage(f)));
      const form = new FormData();
      for (const f of small) form.append('covers+', f);
      const next = await sendRecordForm<Song>('songs', form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = next.covers.filter((c) => !covers.includes(c));
      await warmImages([
        ...added.map((c) => fileUrl(next, c, '600x600')),
        fileUrl(next, mainCover(next), '96x96'),
      ]);
    },
    onSettled: () => setProgress(null),
    onSuccess: refresh,
    onError: () => toast.error('Обложка не загрузилась: проверьте соединение и размер файла'),
  });
  const update = useMutation({
    mutationFn: (patch: Record<string, string>) => collection(pb, 'songs').update(song.id, patch),
    onSuccess: refresh,
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    const ok = files.filter((f) => f.size <= MAX_IMAGE_BYTES);
    if (ok.length < files.length)
      toast.error(`Обложка больше ${fileSize(MAX_IMAGE_BYTES)} не загрузится`);
    const room = MAX_COVERS - covers.length;
    if (ok.length > room) toast.error(`Не больше ${MAX_COVERS} обложек`);
    if (ok.length > 0 && room > 0) upload.mutate(ok.slice(0, room));
  }

  const busy = upload.isPending || update.isPending;

  return (
    <Section title="Обложки">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {covers.map((c) => {
          const isMain = c === main;
          return (
            <div
              key={c}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg bg-groove',
                isMain && 'ring-2 ring-led-amber',
              )}
            >
              <button
                type="button"
                aria-label="Открыть обложку"
                onClick={() => setViewing(c)}
                className="block size-full cursor-zoom-in"
              >
                {fileUrl(song, c, '600x600') && (
                  <img
                    src={fileUrl(song, c, '600x600')}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  aria-label={isMain ? 'Основная обложка' : 'Сделать основной'}
                  aria-pressed={isMain}
                  disabled={busy || isMain}
                  onClick={() => update.mutate({ main_cover: c })}
                  className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <Star className={cn('size-4', isMain && 'fill-led-amber text-led-amber')} />
                </button>
                <button
                  type="button"
                  aria-label="Удалить обложку"
                  disabled={busy}
                  onClick={() =>
                    update.mutate({ 'covers-': c, ...(isMain ? { main_cover: '' } : {}) })
                  }
                  className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          disabled={busy || covers.length >= MAX_COVERS}
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-dim transition-colors hover:bg-panel hover:text-ink"
        >
          <ImagePlus className="size-6" strokeWidth={1.5} />
          Добавить
        </button>
      </div>
      {progress !== null && (
        <Progress
          className="mt-3"
          value={Math.round(progress * 100)}
          aria-label="Загрузка обложки"
        />
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      <ImageViewer
        src={viewing ? fileUrl(song, viewing) : undefined}
        title={`${song.title}: обложка`}
        downloadUrl={viewing ? fileUrl(song, viewing, undefined, true) : undefined}
        onClose={() => setViewing(undefined)}
      />
    </Section>
  );
}

function DeleteSong({ projectId, song }: { projectId: string; song: Song }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => collection(pb, 'songs').delete(song.id),
    onSuccess: async () => {
      setConfirming(false);
      await navigate({ to: '/p/$projectId', params: { projectId } });
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => toast.error('Песня не удалена: проверьте соединение'),
  });
  return (
    <div className="lg:col-span-2">
      <Button
        variant="ghost"
        className="-ml-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
        onClick={() => setConfirming(true)}
      >
        <Trash2 data-icon="inline-start" />
        Удалить песню
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить песню "${song.title}"?`}
        description="Удалятся этапы, текст, обложки и заметки песни."
        confirm="Удалить"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
