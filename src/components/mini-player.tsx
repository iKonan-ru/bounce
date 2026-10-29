import { useLocation, useNavigate } from '@tanstack/react-router';
import { Pause, Play, X } from 'lucide-react';
import { formatTime, seekTo, stopPlayer, togglePlay, usePlayer } from '@/lib/player';
import { cn } from '@/lib/utils';

const baseName = (name: string) => name.replace(/\.[a-z0-9]{2,4}$/i, '');

// Полоса внизу, пока что-то играет или стоит на паузе: запись не прерывается при переходах.
// Название ведёт туда, откуда её запустили; крестик - остановить и убрать полосу.
export function MiniPlayer() {
  const player = usePlayer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const track = player.track;
  if (!track) return null;

  const title = player.meta?.title || baseName(track.name);
  const sub = [player.meta?.artist, player.meta?.album].filter(Boolean).join(' · ');
  const progress = player.duration > 0 ? player.current / player.duration : 0;
  const away = track.origin && track.origin !== pathname;

  return (
    <section
      aria-label="Плеер"
      className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mt-6 animate-enter md:bottom-4"
    >
      <div className="relative overflow-hidden rounded-2xl bg-panel/95 shadow-lg ring-1 ring-border/70 backdrop-blur dark:bg-panel/90 dark:ring-border/40">
        <div className="flex items-center gap-3 p-2 pr-2">
          <button
            type="button"
            aria-label={player.playing ? `Пауза: ${title}` : `Слушать: ${title}`}
            disabled={player.failed}
            onClick={togglePlay}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tape text-tape-ink shadow-sm transition-transform active:scale-90 disabled:opacity-40"
          >
            {player.playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="ml-0.5 size-4 fill-current" />
            )}
          </button>
          {player.meta?.artwork && (
            <img
              src={player.meta.artwork}
              alt=""
              className="size-10 shrink-0 rounded-md object-cover max-sm:hidden"
            />
          )}
          <button
            type="button"
            disabled={!away}
            onClick={() => track.origin && void navigate({ to: track.origin })}
            title={away ? 'Открыть, откуда играет' : undefined}
            className={cn('min-w-0 flex-1 text-left', away && 'cursor-pointer')}
          >
            <span className="block truncate text-sm font-medium">{title}</span>
            {sub && <span className="block truncate text-xs text-dim">{sub}</span>}
          </button>
          <span className="shrink-0 text-xs text-dim tabular-nums">
            {player.failed
              ? 'не открывается'
              : `${formatTime(player.current)} / ${formatTime(player.duration)}`}
          </span>
          <button
            type="button"
            aria-label="Остановить"
            onClick={stopPlayer}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* ход записи - тонкая полоса по нижнему краю, по ней же перематывают */}
        <div className="relative h-1.5 bg-groove/70">
          <div
            className="absolute inset-y-0 left-0 bg-tape"
            style={{ width: `${progress * 100}%` }}
          />
          <input
            type="range"
            aria-label={`Перемотка: ${title}`}
            min={0}
            max={player.duration || 0}
            step={0.1}
            value={player.current}
            disabled={!player.duration}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="absolute inset-x-0 -top-2 h-5 w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
      </div>
    </section>
  );
}
