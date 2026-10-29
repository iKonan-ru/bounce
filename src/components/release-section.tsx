import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AudioLines, Check, ChevronRight, Download, ImagePlus, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AudioPlayer } from '@/components/audio-player';
import { AutosaveInput } from '@/components/autosave-input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DateField } from '@/components/date-field';
import { ImageSlot, useFileUrl } from '@/components/images';
import { GROUP_ROWS, Section } from '@/components/page';
import { PropRow } from '@/components/prop-row';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { errorText } from '@/lib/errors';
import { dateLabel, displayFileName, fileSize } from '@/lib/format';
import { releaseCoverProblem, shrinkImage, warmImages } from '@/lib/images';
import { safeUrl } from '@/lib/markup';
import {
  MAX_COVERS,
  MAX_RELEASE_AUDIO_BYTES,
  mainCover,
  RELEASE_COVER_SIZE,
  releaseMissing,
  type Song,
  songStatus,
} from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { projectQuery } from '@/lib/queries';
import { sendRecordForm } from '@/lib/upload';

// файл не подходит для релиза: причина - для человека
class FileProblem extends Error {}

// Релиз песни: дата, обложка для релиза (JPEG 3000x3000), финальный WAV (по желанию), текст,
// отметка об отправке на лейбл,
// после отправки - ссылка bandlink. "Выпущена" ставится сама в день релиза.
// Без editable - только смотреть и скачать обложку.
export function ReleaseSection({
  projectId,
  song,
  editable,
}: {
  projectId: string;
  song: Song;
  editable: boolean;
}) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const status = songStatus(song);
  const sent = status === 'sent' || status === 'released';
  const missing = releaseMissing(song);
  // только http(s): адрес приходит из записи, а не из формы
  const bandlink = safeUrl(song.bandlink ?? '');
  const refresh = () => client.invalidateQueries({ queryKey: ['songs'] });

  const save = useMutation({
    mutationFn: (patch: Partial<Pick<Song, 'status' | 'target_release' | 'bandlink'>>) =>
      collection(pb, 'songs').update(song.id, patch),
    onSettled: refresh,
    onError: (e) => toast.error(errorText(e, 'Не сохранилось: проверьте соединение')),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const problem = await releaseCoverProblem(file);
      if (problem) throw new FileProblem(problem);
      const form = new FormData();
      // обложка для релиза хранится как есть, а её копия попадает в галерею обложек песни -
      // уменьшенной, как все обложки галереи; галерея полна - копии нет
      form.set('release_cover', file);
      const covers = song.covers ?? [];
      if (covers.length < MAX_COVERS) form.append('covers+', await shrinkImage(file));
      setProgress(0);
      const next = await sendRecordForm<Song>('songs', form, {
        id: song.id,
        onProgress: setProgress,
      });
      const added = (next.covers ?? []).filter((c) => !covers.includes(c));
      await warmImages([
        ...added.map((c) => fileUrl(next, c, '600x600')),
        fileUrl(next, mainCover(next), '96x96'),
      ]);
      return next;
    },
    onSettled: () => setProgress(null),
    onSuccess: refresh,
    onError: (e) =>
      toast.error(
        e instanceof FileProblem ? e.message : 'Обложка не загрузилась: проверьте соединение',
      ),
  });

  const pick = (f: File) => upload.mutate(f);

  return (
    <Section
      title="Релиз"
      action={
        sent && (
          <span
            className={status === 'released' ? 'text-sm text-led-green' : 'text-sm text-led-amber'}
          >
            {status === 'released' ? 'Выпущена' : 'Отправлена на лейбл'}
          </span>
        )
      }
    >
      <div className={GROUP_ROWS}>
        <PropRow label="Дата релиза">
          {editable ? (
            <DateField
              quiet
              id="song-release"
              value={song.target_release ?? ''}
              placeholder="Не выбрана"
              // у отправленной песни дату переносят, но не убирают (так же проверяет сервер)
              clearable={!sent}
              onChange={(target_release) => save.mutate({ target_release })}
            />
          ) : (
            <span className="px-2 text-dim">
              {song.target_release ? dateLabel(song.target_release) : 'Не выбрана'}
            </span>
          )}
        </PropRow>

        <div className="flex items-center gap-3 px-4 py-3">
          <ImageSlot
            record={song}
            file={song.release_cover || undefined}
            thumb="96x96"
            title={`${song.title}: обложка для релиза`}
            onPick={editable ? pick : undefined}
            accept="image/jpeg"
            placeholder={<ImagePlus className="size-5" />}
            className="size-12 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p>Обложка для релиза</p>
            <p className="text-sm text-dim">
              JPEG {RELEASE_COVER_SIZE}x{RELEASE_COVER_SIZE}
              {song.release_cover ? '' : ', не загружена'}
            </p>
          </div>
          {song.release_cover && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Скачать оригинал"
              className="text-dim"
              asChild
            >
              <a href={fileUrl(song, song.release_cover, undefined, true)} download>
                <Download />
              </a>
            </Button>
          )}
          {!sent && editable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-dim"
              disabled={upload.isPending}
              onClick={() => input.current?.click()}
            >
              {song.release_cover ? 'Заменить' : 'Загрузить'}
            </Button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = '';
            }}
          />
        </div>
        {progress !== null && (
          <div className="px-4 py-2">
            <Progress value={Math.round(progress * 100)} aria-label="Загрузка обложки" />
          </div>
        )}

        <ReleaseAudio song={song} editable={editable} sent={sent} />

        <Link
          to="/p/$projectId/songs/$songId/lyrics"
          params={{ projectId, songId: song.id }}
          className="flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-groove/40 md:min-h-11"
        >
          <span className="w-28 shrink-0 text-dim">Текст песни</span>
          <span className="flex flex-1 items-center justify-end gap-1.5">
            {(song.lyrics ?? '').trim() ? (
              <>
                <Check className="size-4 text-led-green" />
                Есть
              </>
            ) : (
              <span className="text-dim">Нет</span>
            )}
          </span>
          <ChevronRight className="size-4 shrink-0 text-dim/60" />
        </Link>

        {sent && !editable && bandlink && (
          <PropRow label="Bandlink">
            <a
              href={bandlink}
              target="_blank"
              rel="noreferrer"
              className="truncate px-2 text-ink underline-offset-4 hover:underline"
            >
              {song.bandlink}
            </a>
          </PropRow>
        )}
        {sent && editable && (
          <PropRow label="Bandlink">
            <AutosaveInput
              id="song-bandlink"
              placeholder="https://band.link/..."
              value={song.bandlink ?? ''}
              validate={(v) => v === '' || /^https?:\/\/\S+$/.test(v)}
              onSave={(bandlink) => save.mutate({ bandlink })}
            />
          </PropRow>
        )}

        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          {!sent && !editable && (
            <p className="flex-1 text-sm text-dim">Ещё не отправлена на лейбл</p>
          )}
          {!sent && editable && (
            <>
              <p className="flex-1 text-sm text-dim">
                {missing.length > 0
                  ? `Для отправки на лейбл нужны: ${missing.join(', ')}`
                  : 'Всё готово к отправке'}
              </p>
              <Button
                variant={missing.length > 0 ? 'secondary' : 'default'}
                disabled={missing.length > 0 || save.isPending}
                onClick={() => save.mutate({ status: 'sent' })}
              >
                <Send data-icon="inline-start" />
                Отправлена на лейбл
              </Button>
            </>
          )}
          {status === 'sent' && (
            <>
              <p className="flex-1 text-sm text-dim">
                {song.target_release
                  ? `Будет выпущена ${dateLabel(song.target_release)}`
                  : 'Укажите дату релиза: в этот день песня будет выпущена'}
              </p>
              {editable && (
                <Button
                  variant="ghost"
                  className="text-dim"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ status: 'done' })}
                >
                  Отменить отправку
                </Button>
              )}
            </>
          )}
          {status === 'released' && (
            <p className="flex-1 text-sm text-dim">
              Выпущена{song.target_release ? ` ${dateLabel(song.target_release)}` : ''}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

// WAV или MP3: по типу, а если браузер его не назвал - по расширению
function isReleaseAudio(f: File): boolean {
  return (
    /^audio\/(wav|x-wav|wave|vnd\.wave|mpeg|mp3)$/.test(f.type) || /\.(wav|mp3)$/i.test(f.name)
  );
}

// Финальная версия трека: послушать прямо в блоке релиза, скачать с исходным именем. Загрузить
// и заменить можно в любой момент, и у выпущенной песни тоже; убрать - только пока песня не
// отправлена на лейбл (так же проверяет сервер, pb_hooks/lib/release.js).
function ReleaseAudio({ song, editable, sent }: { song: Song; editable: boolean; sent: boolean }) {
  const client = useQueryClient();
  const fileUrl = useFileUrl();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const project = useQuery(projectQuery(song.project));
  const file = song.release_audio || undefined;
  const name = song.release_audio_name || (file ? displayFileName(file) : '');
  const refresh = () => client.invalidateQueries({ queryKey: ['songs'] });

  const upload = useMutation({
    mutationFn: async (f: File) => {
      if (!isReleaseAudio(f)) throw new FileProblem('Нужен файл WAV или MP3');
      if (f.size > MAX_RELEASE_AUDIO_BYTES) {
        throw new FileProblem(`Файл больше ${fileSize(MAX_RELEASE_AUDIO_BYTES)} не загрузится`);
      }
      const form = new FormData();
      form.set('release_audio', f);
      form.set('release_audio_name', f.name.slice(0, 300));
      setProgress(0);
      return sendRecordForm<Song>('songs', form, { id: song.id, onProgress: setProgress });
    },
    onSettled: () => setProgress(null),
    onSuccess: refresh,
    onError: (e) =>
      toast.error(
        e instanceof FileProblem ? e.message : 'Трек не загрузился: проверьте соединение',
      ),
  });
  const remove = useMutation({
    mutationFn: () =>
      collection(pb, 'songs').update(song.id, { release_audio: null, release_audio_name: '' }),
    onSuccess: async () => {
      setRemoving(false);
      await refresh();
    },
    onError: () => toast.error('Не сохранилось: проверьте соединение'),
  });

  if (!file && !editable) return null;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {/* загруженный трек - сразу плеер, без строки-заголовка; пустой - строка с загрузкой */}
      {!file && (
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-groove text-dim">
            <AudioLines className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p>Финальная версия</p>
            <p className="truncate text-sm text-dim">WAV или MP3, не загружена</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-dim"
            aria-label="Загрузить финальную версию"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            Загрузить
          </Button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept=".wav,.mp3,audio/wav,audio/x-wav,audio/wave,audio/mpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = '';
        }}
      />
      {progress !== null && (
        <Progress value={Math.round(progress * 100)} aria-label="Загрузка трека" />
      )}
      {file && progress === null && (
        <AudioPlayer
          record={song}
          file={file}
          name={name}
          caption="Финальная версия"
          onReplace={editable ? () => input.current?.click() : undefined}
          onRemove={editable && !sent ? () => setRemoving(true) : undefined}
          meta={{
            artist: project.data?.name,
            album: song.title,
            artwork: song.release_cover
              ? fileUrl(song, song.release_cover, '600x600')
              : fileUrl(song, mainCover(song), '600x600'),
          }}
        />
      )}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Убрать финальную версию?"
        confirm="Убрать"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
