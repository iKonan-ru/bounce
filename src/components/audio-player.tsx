import { Download, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchId3 } from '@/lib/id3';
import { cn } from '@/lib/utils';

const BARS = 56;
// форму волны строим только для файлов поменьше: большие WAV декодировать долго
const PEAKS_LIMIT = 30 * 1024 * 1024;
// играет один плеер: запуск другого ставит этот на паузу
const PLAY_EVENT = 'bounce:audio-play';

function time(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

// Что играет - для системы (экран блокировки, центр управления, наушники): название файла,
// проект, песня и обложка; там же пауза и перемотка.
export type AudioMeta = {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  artwork?: string | undefined;
};

// название трека из имени файла: без расширения
const baseName = (name: string) => name.replace(/\.[a-z0-9]{2,4}$/i, '');

function announce(el: HTMLAudioElement, name: string, meta: AudioMeta | undefined) {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: meta?.title || baseName(name),
      artist: meta?.artist ?? '',
      album: meta?.album ?? '',
      artwork: meta?.artwork
        ? [
            meta.artwork.startsWith('blob:')
              ? { src: meta.artwork }
              : { src: meta.artwork, sizes: '600x600' },
          ]
        : [],
    });
    const seek = (to: number) => {
      el.currentTime = Math.max(0, Math.min(el.duration || to, to));
    };
    ms.setActionHandler('play', () => void el.play());
    ms.setActionHandler('pause', () => el.pause());
    ms.setActionHandler('stop', () => el.pause());
    ms.setActionHandler('seekbackward', (d) => seek(el.currentTime - (d.seekOffset ?? 10)));
    ms.setActionHandler('seekforward', (d) => seek(el.currentTime + (d.seekOffset ?? 10)));
    ms.setActionHandler('seekto', (d) => d.seekTime !== undefined && seek(d.seekTime));
  } catch {
    // старые браузеры знают не все действия - без них просто нет кнопок в системе
  }
}

function updatePosition(el: HTMLAudioElement) {
  if (!('mediaSession' in navigator) || !Number.isFinite(el.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: el.duration,
      position: Math.min(el.currentTime, el.duration),
      playbackRate: el.playbackRate,
    });
  } catch {
    // позиция вне длительности на мгновение после перемотки - пропускаем
  }
}

// Плеер записи в духе пульта: круглая кнопка, полоски громкости (как индикатор уровня),
// время и скачивание. Перемотка - нажатием или перетаскиванием по полоскам, стрелками.
export function AudioPlayer({
  src,
  name,
  downloadUrl,
  meta,
  readTags,
}: {
  src: string | undefined;
  name: string;
  downloadUrl?: string | undefined;
  // готовые сведения для системы (финальная версия: песня и её обложка)
  meta?: AudioMeta;
  // взять сведения из тегов MP3; у WAV и файлов без тегов - только имя файла
  readTags?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const asked = useRef(false);
  // теги MP3 читаются один раз, при первом запуске; обложка из них - временная ссылка
  const tags = useRef<{ meta: AudioMeta } | 'loading' | null>(null);
  useEffect(
    () => () => {
      const t = tags.current;
      if (t && t !== 'loading' && t.meta.artwork) URL.revokeObjectURL(t.meta.artwork);
    },
    [],
  );

  function systemMeta(el: HTMLAudioElement) {
    if (!readTags) {
      announce(el, name, meta);
      return;
    }
    const t = tags.current;
    if (t && t !== 'loading') {
      announce(el, name, t.meta);
      return;
    }
    announce(el, name, undefined);
    if (t === 'loading' || !src || !/\.mp3$/i.test(name)) return;
    tags.current = 'loading';
    void fetchId3(src).then((found) => {
      const next: AudioMeta = found
        ? {
            title: found.title,
            artist: found.artist,
            album: found.album,
            artwork: found.picture
              ? URL.createObjectURL(
                  new Blob([new Uint8Array(found.picture.data)], { type: found.picture.mime }),
                )
              : undefined,
          }
        : {};
      tags.current = { meta: next };
      // пока читали теги, могли включить другую запись
      if (!el.paused) announce(el, name, next);
    });
  }

  useEffect(() => {
    const other = (e: Event) => {
      if (e instanceof CustomEvent && e.detail !== audio.current) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, other);
    return () => window.removeEventListener(PLAY_EVENT, other);
  }, []);

  // форма волны - при первом запуске, чтобы не качать записи, которые не слушают
  function wantPeaks() {
    if (asked.current || !src) return;
    asked.current = true;
    const ctrl = new AbortController();
    loadPeaks(src, ctrl.signal)
      .then((p) => p && setPeaks(p))
      .catch(() => undefined);
  }

  function toggle() {
    const el = audio.current;
    if (!el || !src) return;
    if (el.paused) {
      wantPeaks();
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: el }));
      el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  }

  const progress = duration > 0 ? current / duration : 0;
  const bars = peaks ?? Array.from({ length: BARS }, () => 0.35);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-console/70 p-2 pr-3 ring-1 ring-border/60 dark:bg-black/15 dark:ring-border/40">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={(e) => {
          setPlaying(true);
          systemMeta(e.currentTarget);
          updatePosition(e.currentTarget);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }}
        onPause={() => {
          setPlaying(false);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }}
        onSeeked={(e) => updatePosition(e.currentTarget)}
        onLoadedData={(e) => updatePosition(e.currentTarget)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      >
        <track kind="captions" />
      </audio>
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
            {failed ? 'не открывается' : `${time(current)} / ${time(duration)}`}
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
            disabled={!duration}
            onChange={(e) => {
              const el = audio.current;
              if (!el) return;
              el.currentTime = Number(e.target.value);
              setCurrent(el.currentTime);
            }}
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
