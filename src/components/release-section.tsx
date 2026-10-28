import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check, ChevronRight, Download, ImagePlus, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AutosaveInput } from '@/components/autosave-input';
import { DateField } from '@/components/date-field';
import { ImageSlot, useFileUrl } from '@/components/images';
import { GROUP_ROWS, Section } from '@/components/page';
import { PropRow } from '@/components/prop-row';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { errorText } from '@/lib/errors';
import { dateLabel } from '@/lib/format';
import { releaseCoverProblem } from '@/lib/images';
import { RELEASE_COVER_SIZE, releaseMissing, type Song, songStatus } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import { sendRecordForm } from '@/lib/upload';

// файл не подходит для релиза: причина - для человека
class CoverProblem extends Error {}

// Релиз песни: дата, обложка для релиза (JPEG 3000x3000), текст, отметка об отправке на лейбл,
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
      if (problem) throw new CoverProblem(problem);
      const form = new FormData();
      form.set('release_cover', file);
      setProgress(0);
      return sendRecordForm<Song>('songs', form, { id: song.id, onProgress: setProgress });
    },
    onSettled: () => setProgress(null),
    onSuccess: refresh,
    onError: (e) =>
      toast.error(
        e instanceof CoverProblem ? e.message : 'Обложка не загрузилась: проверьте соединение',
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

        {sent && !editable && song.bandlink && (
          <PropRow label="Bandlink">
            <a
              href={song.bandlink}
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
                  ? `Станет выпущенной ${dateLabel(song.target_release)}`
                  : 'Укажите дату релиза: в этот день песня станет выпущенной'}
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
