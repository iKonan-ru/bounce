import { Pause, Play, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { useMiniPlayer } from '../hooks/use-mini-player';
import { togglePlay, stopPlayer } from '../store/player';
import { SeekArea } from './seek-area';
import { Volume } from './volume';

/**
 * Полоса внизу, пока что-то играет или стоит на паузе: запись не прерывается при переходах
 *
 * Название ведёт туда, откуда её запустили; крестик - остановить и убрать полосу
 */
export function MiniPlayer(): ReactNode {
  const miniPlayer = useMiniPlayer();

  if (!miniPlayer) {
    return null;
  }

  const {
    player,
    title,
    subtitle,
    artwork,
    isAway,
    originTitle,
    playLabel,
    seekLabel,
    timeLabel,
    savedStyle,
    progressStyle,
    setScrubFraction,
    onTitleClick,
  } = miniPlayer;
  const titleButtonClassName = cn('min-w-0 flex-1 text-left', {
    'cursor-pointer': isAway,
  });

  return (
    <>
      {/* место под полосой в конце страницы: последний блок не прячется под ней */}
      <div aria-hidden="true" className="h-20 shrink-0" />
      {/* Полоса закреплена над низом экрана (на телефоне - над вкладками) и не прыгает в конце
          страницы. По ширине - как колонка страницы: слева место боковой панели (--sidebar). */}
      <section
        aria-label="Плеер"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[calc(4.75rem+env(safe-area-inset-bottom))] transition-[left] duration-200 ease-out-soft md:left-(--sidebar,0px) md:pb-4 max-md:[html[data-typing]_&]:hidden"
      >
        {/* страница под полосой тает в цвет фона - полоса не сливается с содержимым */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-10 bottom-0 bg-linear-to-t from-console from-45% via-console/85 via-70% to-transparent"
        />
        <div className="relative mx-auto max-w-6xl animate-enter px-4 md:px-8 lg:px-10">
          <div className="relative">
            <div className="pointer-events-auto relative overflow-hidden rounded-2xl bg-panel shadow-[0_10px_30px_-6px_rgb(0_0_0/0.25)] ring-1 ring-border dark:bg-groove dark:shadow-[0_10px_30px_-6px_rgb(0_0_0/0.6)] dark:ring-white/10">
              <div className="flex items-center gap-3 p-2 pr-2">
                <button
                  type="button"
                  aria-label={playLabel}
                  disabled={player.isFailed}
                  onClick={togglePlay}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tape text-tape-ink shadow-sm transition-transform active:scale-90 disabled:opacity-40"
                >
                  {player.isPlaying ? (
                    <Pause className="size-4 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-4 fill-current" />
                  )}
                </button>
                {artwork && (
                  <img
                    src={artwork}
                    alt=""
                    className="size-10 shrink-0 rounded-md object-cover max-sm:hidden"
                  />
                )}
                <button
                  type="button"
                  disabled={!isAway}
                  onClick={onTitleClick}
                  title={originTitle}
                  className={titleButtonClassName}
                >
                  <span className="block truncate text-sm font-medium">
                    {title}
                  </span>
                  {subtitle && (
                    <span className="block truncate text-xs text-dim">
                      {subtitle}
                    </span>
                  )}
                </button>
                <Volume player={player} />
                <span className="shrink-0 text-xs text-dim tabular-nums">
                  {timeLabel}
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
              {/* ход записи - тонкая полоса по нижнему краю; под ходом бледная полоса - сколько
                записи уже скачано на устройство. Перематывают в области пошире (SeekArea) */}
              <div className="relative h-1.5 bg-groove/70 dark:bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-ink/15 transition-[width] duration-300 dark:bg-white/20"
                  style={savedStyle}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-tape"
                  style={progressStyle}
                />
              </div>
            </div>
            <SeekArea
              label={seekLabel}
              duration={player.duration}
              current={player.current}
              onScrub={setScrubFraction}
            />
          </div>
        </div>
      </section>
    </>
  );
}
