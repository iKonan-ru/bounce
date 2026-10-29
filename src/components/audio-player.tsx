import { useLocation } from '@tanstack/react-router';
import { Download, Pause, Play, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFileUrl } from '@/components/images';
import { type AudioMeta, formatTime, playTrack, togglePlay, usePlayer } from '@/lib/player';
import { cn } from '@/lib/utils';

export type { AudioMeta } from '@/lib/player';

type FileRecord = { id: string; collectionId: string; collectionName: string };

// длительность записи до запуска: читаются только её заголовки
function useDuration(src: string | undefined): number {
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!src) return;
    const a = new Audio();
    a.preload = 'metadata';
    const done = () => setDuration(a.duration);
    a.addEventListener('loadedmetadata', done);
    a.src = src;
    return () => {
      a.removeEventListener('loadedmetadata', done);
      a.removeAttribute('src');
      a.load();
    };
  }, [src]);
  return duration;
}

// Запись в заметке или релизе: кнопка запуска, название, длительность и формат, скачивание.
// Ход и перемотка - в полосе плеера внизу: запись играет дальше при переходах между страницами.
export function AudioPlayer({
  record,
  file,
  name,
  meta,
  readTags,
  caption,
  onRemove,
}: {
  record: FileRecord;
  file: string;
  name: string;
  // готовые сведения для системы (финальная версия: песня и её обложка)
  meta?: AudioMeta;
  // взять сведения из тегов MP3; у WAV и файлов без тегов - только имя файла
  readTags?: boolean;
  // что это за запись, мелко над названием ("Финальная версия")
  caption?: string;
  // кнопка "убрать" рядом со скачиванием
  onRemove?: (() => void) | undefined;
}) {
  const fileUrl = useFileUrl();
  const src = fileUrl(record, file);
  const downloadUrl = fileUrl(record, file, undefined, true);
  const { pathname } = useLocation();
  const player = usePlayer();
  const key = `${record.collectionName}/${record.id}/${file}`;
  const mine = player.track?.key === key;
  const playing = mine && player.playing;
  const ownDuration = useDuration(src);
  const duration = mine && player.duration ? player.duration : ownDuration;
  const failed = mine && player.failed;
  const format = /\.([a-z0-9]{2,4})$/i.exec(name)?.[1]?.toUpperCase();

  function toggle() {
    if (mine) togglePlay();
    else
      void playTrack({
        key,
        name,
        file: { record, name: file },
        meta,
        readTags,
        origin: pathname,
      });
  }

  const info = failed
    ? 'не открывается'
    : [
        mine
          ? `${formatTime(player.current)} / ${formatTime(duration)}`
          : duration
            ? formatTime(duration)
            : '',
        format,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl p-1.5 pr-2 ring-1 transition-colors',
        mine
          ? 'bg-groove/60 ring-border dark:ring-white/10'
          : 'bg-console/70 ring-border/60 dark:bg-black/15 dark:ring-border/40',
      )}
    >
      <button
        type="button"
        aria-label={playing ? `Пауза: ${name}` : `Слушать: ${name}`}
        disabled={!src || failed}
        onClick={toggle}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tape text-tape-ink shadow-sm transition-transform active:scale-90 disabled:opacity-40"
      >
        {playing ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {caption && <p className="truncate text-[0.6875rem] text-dim">{caption}</p>}
        <p className="truncate text-sm font-medium">{name}</p>
        {!caption && info && (
          <p className="truncate text-[0.6875rem] text-dim tabular-nums">{info}</p>
        )}
      </div>
      {caption && info && (
        <span className="shrink-0 text-[0.6875rem] text-dim tabular-nums">{info}</span>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          // своё имя файла: на сервере оно без кириллицы
          download={name}
          aria-label={`Скачать: ${name}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
        >
          <Download className="size-4" />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Убрать: ${name}`}
          onClick={onRemove}
          className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-led-red/10 hover:text-led-red"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
