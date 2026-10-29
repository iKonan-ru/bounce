import { useLocation } from '@tanstack/react-router';
import { Download, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFileUrl } from '@/components/images';
import { type AudioMeta, formatTime, playTrack, seekTo, togglePlay, usePlayer } from '@/lib/player';
import { cn } from '@/lib/utils';

export type { AudioMeta } from '@/lib/player';

const BARS = 56;
// форму волны строим только для файлов поменьше: большие WAV декодировать долго
const PEAKS_LIMIT = 30 * 1024 * 1024;

type FileRecord = { id: string; collectionId: string; collectionName: string };

// пики громкости по BARS отрезкам, 0..1
async function loadPeaks(src: string, signal: AbortSignal): Promise<number[] | null> {
  const res = await fetch(src, { signal });
  const size = Number(res.headers.get('content-length') ?? '0');
  if (!res.ok || size > PEAKS_LIMIT) {
    await res.body?.cancel();
    return null;
  }
  const data = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(data);
    const ch = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(ch.length / BARS));
    const peaks: number[] = [];
    for (let i = 0; i < BARS; i++) {
      let max = 0;
      for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j += 16) {
        const v = Math.abs(ch[j] ?? 0);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    const top = Math.max(...peaks, 0.01);
    return peaks.map((p) => Math.max(0.08, p / top));
  } finally {
    void ctx.close();
  }
}

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

// Плеер записи в духе пульта: круглая кнопка, полоски громкости (как индикатор уровня),
// время и скачивание. Перемотка - нажатием или перетаскиванием по полоскам, стрелками. Играет
// общий плеер приложения: запись не прерывается при переходах, снизу видна полоса с ней.
export function AudioPlayer({
  record,
  file,
  name,
  meta,
  readTags,
}: {
  record: FileRecord;
  file: string;
  name: string;
  // готовые сведения для системы (финальная версия: песня и её обложка)
  meta?: AudioMeta;
  // взять сведения из тегов MP3; у WAV и файлов без тегов - только имя файла
  readTags?: boolean;
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
  const current = mine ? player.current : 0;
  const failed = mine && player.failed;
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const asked = useRef(false);

  // форма волны - при первом запуске, чтобы не качать записи, которые не слушают
  function wantPeaks() {
    if (asked.current || !src) return;
    asked.current = true;
    loadPeaks(src, new AbortController().signal)
      .then((p) => p && setPeaks(p))
      .catch(() => undefined);
  }

  function toggle() {
    wantPeaks();
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

  const progress = duration > 0 ? current / duration : 0;
  const bars = peaks ?? Array.from({ length: BARS }, () => 0.35);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-console/70 p-2 pr-3 ring-1 ring-border/60 dark:bg-black/15 dark:ring-border/40">
      <button
        type="button"
        aria-label={playing ? `Пауза: ${name}` : `Слушать: ${name}`}
        disabled={!src || failed}
        onClick={toggle}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tape text-tape-ink shadow-sm transition-transform active:scale-90 disabled:opacity-40"
      >
        {playing ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium">{name}</span>
          <span className="shrink-0 text-[0.6875rem] text-dim tabular-nums">
            {failed ? 'не открывается' : `${formatTime(current)} / ${formatTime(duration)}`}
          </span>
        </div>
        <div className="relative mt-1 h-7">
          <div aria-hidden="true" className="flex h-full items-center gap-px">
            {bars.map((h, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: полоски по порядку времени
                key={i}
                className={cn(
                  'min-w-0 flex-1 rounded-full transition-[height,background-color] duration-300',
                  i / BARS < progress ? 'bg-ink' : 'bg-groove dark:bg-groove',
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            aria-label={`Перемотка: ${name}`}
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            disabled={!mine || !duration}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
      </div>
      {downloadUrl && (
        <a
          href={downloadUrl}
          // своё имя файла: на сервере оно без кириллицы
          download={name}
          aria-label={`Скачать: ${name}`}
          className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
        >
          <Download className="size-4" />
        </a>
      )}
    </div>
  );
}
