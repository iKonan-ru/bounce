import { useLocation, useNavigate } from '@tanstack/react-router';
import { Pause, Play, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { baseName } from '@/lib/format';
import {
  canSetVolume,
  formatTime,
  type PlayerState,
  seekTo,
  setVolume,
  stopPlayer,
  togglePlay,
  usePlayer,
} from '@/lib/player';
import { cn } from '@/lib/utils';

// Полоса внизу, пока что-то играет или стоит на паузе: запись не прерывается при переходах.
// Название ведёт туда, откуда её запустили; крестик - остановить и убрать полосу.
export function MiniPlayer() {
  const player = usePlayer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // куда тянут по полосе (0..1), пока палец или мышь не отпустили
  const [scrub, setScrub] = useState<number | null>(null);
  const track = player.track;
  if (!track) return null;

  const title = player.meta?.title || baseName(track.name);
  const sub = [player.meta?.artist, player.meta?.album].filter(Boolean).join(' · ');
  const progress = scrub ?? (player.duration > 0 ? player.current / player.duration : 0);
  const shownTime = scrub === null ? player.current : scrub * player.duration;
  const away = track.origin && track.origin !== pathname;

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
                <Volume player={player} />
                <span className="shrink-0 text-xs text-dim tabular-nums">
                  {player.failed
                    ? 'не открывается'
                    : `${formatTime(shownTime)} / ${formatTime(player.duration)}`}
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
                  style={{ width: `${player.saved * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-tape"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            <SeekArea
              label={`Перемотка: ${title}`}
              duration={player.duration}
              current={player.current}
              onScrub={setScrub}
            />
          </div>
        </div>
      </section>
    </>
  );
}

// Перемотка: невидимая область от низа кнопок до промежутка под плеером (24px), а видимая
// полоса остаётся тонкой. Своя, а не <input type="range">: на iPhone ползунок двигается только
// за бегунок, нажатие на шкалу его не переносит, а здесь бегунка не видно. Пока тянут, ход и
// время показывают, куда тянут; перематывается, когда отпустили.
function SeekArea({
  label,
  duration,
  current,
  onScrub,
}: {
  label: string;
  duration: number;
  current: number;
  onScrub: (fraction: number | null) => void;
}) {
  const ready = duration > 0;
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  const step = (e: KeyboardEvent<HTMLDivElement>) => {
    const by: Record<string, number> = {
      ArrowRight: 5,
      ArrowUp: 5,
      ArrowLeft: -5,
      ArrowDown: -5,
      PageUp: 30,
      PageDown: -30,
    };
    const shift = by[e.key];
    if (e.key === 'Home') seekTo(0);
    else if (e.key === 'End') seekTo(duration);
    else if (shift !== undefined) seekTo(current + shift);
    else return;
    e.preventDefault();
  };
  return (
    <div
      role="slider"
      tabIndex={ready ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(current)}
      aria-valuetext={`${formatTime(current)} из ${formatTime(duration)}`}
      aria-disabled={!ready}
      onPointerDown={(e) => {
        if (!ready) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onScrub(at(e));
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onScrub(at(e));
      }}
      onPointerUp={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        seekTo(at(e) * duration);
        onScrub(null);
      }}
      onPointerCancel={() => onScrub(null)}
      onKeyDown={step}
      className={cn(
        'pointer-events-auto absolute inset-x-0 top-[calc(100%-0.875rem)] h-6 touch-none outline-none',
        ready && 'cursor-pointer',
      )}
    >
      {/* фокус с клавиатуры - рамкой вокруг видимой полосы, а не всей области */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-2 h-1.5 opacity-0 ring-2 ring-ring in-focus-visible:opacity-100"
      />
    </div>
  );
}

function VolumeIcon({ player }: { player: PlayerState }) {
  if (player.muted || player.volume === 0) return <VolumeX className="size-4" />;
  return player.volume < 0.5 ? <Volume1 className="size-4" /> : <Volume2 className="size-4" />;
}

// заполненная часть шкалы громкости (.volume-range в index.css)
function fillStyle(v: number): CSSProperties & { '--fill': string } {
  return { '--fill': `${Math.round(v * 100)}%` };
}

function VolumeSlider({ player, className }: { player: PlayerState; className?: string }) {
  return (
    <input
      type="range"
      aria-label="Громкость"
      min={0}
      max={1}
      step={0.01}
      value={player.muted ? 0 : player.volume}
      onChange={(e) => setVolume(Number(e.target.value))}
      style={fillStyle(player.muted ? 0 : player.volume)}
      className={cn('volume-range h-9', className)}
    />
  );
}

// Громкость: на компьютере - значок (выключить звук) и ползунок рядом, на телефоне - ползунок
// по нажатию на значок. Где браузер не даёт менять громкость (iPhone, iPad) - её нет: там она
// только кнопками устройства.
function Volume({ player }: { player: PlayerState }) {
  if (!canSetVolume()) return null;
  const mute = () =>
    setVolume(player.volume === 0 ? 0.6 : player.volume, !(player.muted || player.volume === 0));
  const icon =
    'flex size-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink';
  return (
    <>
      <div className="flex items-center max-md:hidden">
        <button
          type="button"
          aria-label={player.muted ? 'Включить звук' : 'Выключить звук'}
          onClick={mute}
          className={icon}
        >
          <VolumeIcon player={player} />
        </button>
        <VolumeSlider player={player} className="w-24" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Громкость" className={cn(icon, 'md:hidden')}>
            <VolumeIcon player={player} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="flex w-56 items-center gap-1 p-1.5">
          <button
            type="button"
            aria-label={player.muted ? 'Включить звук' : 'Выключить звук'}
            onClick={mute}
            className={icon}
          >
            <VolumeIcon player={player} />
          </button>
          <VolumeSlider player={player} className="min-w-0 flex-1 pr-2" />
        </PopoverContent>
      </Popover>
    </>
  );
}
