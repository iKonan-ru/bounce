import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSongCrumbs } from '@/components/crumbs';
import { DateField } from '@/components/date-field';
import { useFileUrl } from '@/components/images';
import { PageHeader, SectionTitle } from '@/components/page';
import { Segmented } from '@/components/segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { fileSize } from '@/lib/format';
import {
  MAX_COVERS,
  MAX_IMAGE_BYTES,
  mainCover,
  SONG_STATUS_LABEL,
  SONG_STATUSES,
  type Song,
  type SongStatus,
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
        <div className="grid max-w-5xl gap-10 lg:grid-cols-2">
          <SongForm song={song.data} />
          <div className="flex flex-col gap-10">
            <Covers song={song.data} />
            <DeleteSong projectId={projectId} song={song.data} />
          </div>
        </div>
      )}
    </>
  );
}

function SongForm({ song }: { song: Song }) {
  const client = useQueryClient();
  const [title, setTitle] = useState(song.title);
  const [status, setStatus] = useState<SongStatus>(song.status);
  const [bpm, setBpm] = useState(song.bpm ? String(song.bpm) : '');
  const [key, setKey] = useState(song.key ?? '');
  const [release, setRelease] = useState(song.target_release ?? '');

  // соавтор поменял песню - поля берут новые значения
  const updated = song.updated;
  // biome-ignore lint/correctness/useExhaustiveDependencies: поля сбрасываются только при новой версии песни
  useEffect(() => {
    setTitle(song.title);
    setStatus(song.status);
    setBpm(song.bpm ? String(song.bpm) : '');
    setKey(song.key ?? '');
    setRelease(song.target_release ?? '');
  }, [updated]);

  const bpmValue = bpm.trim() === '' ? null : Number(bpm);
  const bpmOk =
    bpmValue === null || (Number.isInteger(bpmValue) && bpmValue >= 20 && bpmValue <= 400);
  const dirty =
    title.trim() !== song.title ||
    status !== song.status ||
    (bpmValue ?? 0) !== (song.bpm ?? 0) ||
    key.trim() !== (song.key ?? '') ||
    release !== (song.target_release ?? '');

  const save = useMutation({
    mutationFn: () =>
      collection(pb, 'songs').update(song.id, {
        title: title.trim(),
        status,
        bpm: bpmValue,
        key: key.trim(),
        target_release: release,
      }),
    onSuccess: async () => {
      toast.success('Сохранено');
      await client.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && bpmOk && dirty) save.mutate();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="song-title">Название</Label>
        <Input
          id="song-title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Статус</span>
        <Segmented
          label="Статус песни"
          className="grid grid-cols-2 sm:flex"
          options={SONG_STATUSES.map((s) => ({ value: s, label: SONG_STATUS_LABEL[s] }))}
          value={status}
          onChange={setStatus}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="song-bpm">Темп, BPM</Label>
          <Input
            id="song-bpm"
            inputMode="numeric"
            value={bpm}
            aria-invalid={!bpmOk}
            onChange={(e) => setBpm(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="song-key">Тональность</Label>
          <Input
            id="song-key"
            maxLength={20}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="song-release">Дата релиза</Label>
        <DateField
          id="song-release"
          value={release}
          onChange={setRelease}
          placeholder="Не выбрана"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={!dirty || !title.trim() || !bpmOk || save.isPending}
      >
        Сохранить
      </Button>
    </form>
  );
}

function Covers({ song }: { song: Song }) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const covers = song.covers ?? [];
  const main = mainCover(song);
  const refresh = () => client.invalidateQueries({ queryKey: ['songs'] });

  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const f of files) form.append('covers+', f);
      setProgress(0);
      return sendRecordForm<Song>('songs', form, { id: song.id, onProgress: setProgress });
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
    <section>
      <SectionTitle>Обложки</SectionTitle>
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
              {fileUrl(song, c, '600x600') && (
                <img src={fileUrl(song, c, '600x600')} alt="" className="size-full object-cover" />
              )}
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
    </section>
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
    <section>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
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
    </section>
  );
}
