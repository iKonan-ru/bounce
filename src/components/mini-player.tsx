import { useLocation, useNavigate } from '@tanstack/react-router';
import { Pause, Play, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useState,
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getBaseName } from '@/lib/format';
import {
  checkIsVolumeAdjustable,
  formatTime,
  type PlayerState,
  seekTo,
  setVolume,
  stopPlayer,
  togglePlay,
  usePlayer,
} from '@/lib/player';
import { cn } from '@/lib/utils';

/** Разделитель исполнителя и альбома */
const SUBTITLE_SEPARATOR = ' \u00B7 ';

/** Процентов в целом */
const PERCENT = 100;

/** Шаг перемотки стрелками, секунд */
const SEEK_ARROW_SECONDS = 5;

/** Шаг перемотки клавишами PageUp и PageDown, секунд */
const SEEK_PAGE_SECONDS = 30;

/** Сдвиг перемотки по клавише, секунд */
const SEEK_SHIFT_BY_KEY: Record<string, number> = {
  ArrowRight: SEEK_ARROW_SECONDS,
  ArrowUp: SEEK_ARROW_SECONDS,
  ArrowLeft: -SEEK_ARROW_SECONDS,
  ArrowDown: -SEEK_ARROW_SECONDS,
  PageUp: SEEK_PAGE_SECONDS,
  PageDown: -SEEK_PAGE_SECONDS,
};

/** Ниже этой громкости значок - тихий динамик */
const QUIET_VOLUME = 0.5;

/** Громкость, с которой включается звук, если её убрали до нуля */
const UNMUTE_VOLUME = 0.6;

/** Шаг ползунка громкости */
const VOLUME_STEP = 0.01;

/** Кнопка-значок громкости */
const ICON_BUTTON_CLASS_NAME =
  'flex size-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink';

/** Стиль шкалы громкости с заполненной частью в CSS-переменной (.volume-range в index.css) */
interface FillStyle extends CSSProperties {
  '--fill': string;
}

/** Результат хука полосы плеера */
interface UseMiniPlayerResult {
  player: PlayerState;
  /** Название: из тегов или имя файла */
  title: string;
  /** Исполнитель и альбом */
  subtitle: string;
  /** Ход записи 0..1; пока тянут - куда тянут */
  progress: number;
  /** Обложка из тегов */
  artwork: string | undefined;
  /** Запись запущена на другой странице: название ведёт туда */
  isAway: boolean;
  /** Подсказка на названии */
  originTitle: string | undefined;
  playLabel: string;
  seekLabel: string;
  timeLabel: string;
  savedStyle: CSSProperties;
  progressStyle: CSSProperties;
  setScrubFraction: (fraction: number | null) => void;
  onTitleClick: () => void;
}

/** Пропсы области перемотки */
interface SeekAreaProps {
  label: string;
  duration: number;
  current: number;
  /** Куда тянут (0..1); null - отпустили */
  onScrub: (fraction: number | null) => void;
}

/** Параметры хука области перемотки */
interface UseSeekAreaParams extends Omit<SeekAreaProps, 'label'> {}

/** Результат хука области перемотки */
interface UseSeekAreaResult {
  isReady: boolean;
  tabIndex: number;
  valueMax: number;
  valueNow: number;
  valueText: string;
  onSliderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onSliderPointerCancel: () => void;
  onSliderKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** Пропсы плеерных значков и ползунков громкости */
interface VolumeProps {
  player: PlayerState;
}

/** Пропсы ползунка громкости */
interface VolumeSliderProps extends VolumeProps {
  className?: string;
}

/** Доля 0..1 как ширина полосы */
function getWidthStyle(fraction: number): CSSProperties {
  return { width: `${fraction * PERCENT}%` };
}

/** Сколько записи проиграно, 0..1; пока длина неизвестна - 0 */
function getPlayedFraction(current: number, duration: number): number {
  const hasDuration = duration > 0;
  if (!hasDuration) {
    return 0;
  }
  return current / duration;
}

/** Время на полосе: пока тянут - куда тянут, иначе - сколько проиграно */
function getShownTime(scrubFraction: number | null, current: number, duration: number): number {
  if (scrubFraction === null) {
    return current;
  }
  return scrubFraction * duration;
}

/** Куда указывает палец или мышь на полосе перемотки, 0..1 */
function getPointerFraction(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
}

/** Заполненная часть шкалы громкости (.volume-range в index.css) */
function getFillStyle(volume: number): FillStyle {
  return { '--fill': `${Math.round(volume * PERCENT)}%` };
}

/** Звук выключен или громкость на нуле */
function checkIsSilent(player: PlayerState): boolean {
  return player.isMuted || player.volume === 0;
}

/** Полоса плеера: что играет, ход записи и куда ведёт название; null - ничего не играет */
function useMiniPlayer(): UseMiniPlayerResult | null {
  const player = usePlayer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // куда тянут по полосе (0..1), пока палец или мышь не отпустили
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const track = player.track;
  if (!track) {
    return null;
  }

  const title = player.meta?.title || getBaseName(track.name);
  const subtitle = [player.meta?.artist, player.meta?.album]
    .filter(Boolean)
    .join(SUBTITLE_SEPARATOR);
  const playedFraction = getPlayedFraction(player.current, player.duration);
  const progress = scrubFraction ?? playedFraction;
  const shownTime = getShownTime(scrubFraction, player.current, player.duration);
  const isAway = Boolean(track.origin) && track.origin !== pathname;
  const originTitle = isAway ? 'Открыть, откуда играет' : undefined;
  const pauseLabel = `Пауза: ${title}`;
  const listenLabel = `Слушать: ${title}`;
  const playLabel = player.isPlaying ? pauseLabel : listenLabel;
  const playTimeLabel = `${formatTime(shownTime)} / ${formatTime(player.duration)}`;
  const timeLabel = player.isFailed ? 'не открывается' : playTimeLabel;

  const onTitleClick = (): void => {
    if (!track.origin) {
      return;
    }
    void navigate({ to: track.origin });
  };

  return {
    player,
    title,
    subtitle,
    progress,
    artwork: player.meta?.artwork,
    isAway,
    originTitle,
    playLabel,
    seekLabel: `Перемотка: ${title}`,
    timeLabel,
    savedStyle: getWidthStyle(player.saved),
    progressStyle: getWidthStyle(progress),
    setScrubFraction,
    onTitleClick,
  };
}

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
  const titleButtonClassName = cn('min-w-0 flex-1 text-left', { 'cursor-pointer': isAway });

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
                  <span className="block truncate text-sm font-medium">{title}</span>
                  {subtitle && <span className="block truncate text-xs text-dim">{subtitle}</span>}
                </button>
                <Volume player={player} />
                <span className="shrink-0 text-xs text-dim tabular-nums">{timeLabel}</span>
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
                <div className="absolute inset-y-0 left-0 bg-tape" style={progressStyle} />
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

/** Перемотка: пока тянут - показывает, куда тянут; перематывает, когда отпустили */
function useSeekArea({ duration, current, onScrub }: UseSeekAreaParams): UseSeekAreaResult {
  const isReady = duration > 0;
  const tabIndex = isReady ? 0 : -1;

  const onSliderPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isReady) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    onScrub(getPointerFraction(event));
  };
  const onSliderPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      onScrub(getPointerFraction(event));
    }
  };
  const onSliderPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    seekTo(getPointerFraction(event) * duration);
    onScrub(null);
  };
  const onSliderPointerCancel = (): void => {
    onScrub(null);
  };
  const onSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Home') {
      seekTo(0);
      event.preventDefault();
      return;
    }
    if (event.key === 'End') {
      seekTo(duration);
      event.preventDefault();
      return;
    }
    const shift = SEEK_SHIFT_BY_KEY[event.key];
    if (shift === undefined) {
      return;
    }
    seekTo(current + shift);
    event.preventDefault();
  };

  return {
    isReady,
    tabIndex,
    valueMax: Math.round(duration),
    valueNow: Math.round(current),
    valueText: `${formatTime(current)} из ${formatTime(duration)}`,
    onSliderPointerDown,
    onSliderPointerMove,
    onSliderPointerUp,
    onSliderPointerCancel,
    onSliderKeyDown,
  };
}

/**
 * Перемотка: невидимая область от низа кнопок до промежутка под плеером (24px), а видимая
 * полоса остаётся тонкой
 *
 * Своя, а не <input type="range">: на iPhone ползунок двигается только за бегунок, нажатие на
 * шкалу его не переносит, а здесь бегунка не видно. Пока тянут, ход и время показывают, куда
 * тянут; перематывается, когда отпустили
 */
function SeekArea({ label, duration, current, onScrub }: SeekAreaProps): ReactNode {
  const {
    isReady,
    tabIndex,
    valueMax,
    valueNow,
    valueText,
    onSliderPointerDown,
    onSliderPointerMove,
    onSliderPointerUp,
    onSliderPointerCancel,
    onSliderKeyDown,
  } = useSeekArea({ duration, current, onScrub });
  const sliderClassName = cn(
    'pointer-events-auto absolute inset-x-0 top-[calc(100%-0.875rem)] h-6 touch-none outline-none',
    { 'cursor-pointer': isReady },
  );
  return (
    <div
      role="slider"
      tabIndex={tabIndex}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      aria-valuetext={valueText}
      aria-disabled={!isReady}
      onPointerDown={onSliderPointerDown}
      onPointerMove={onSliderPointerMove}
      onPointerUp={onSliderPointerUp}
      onPointerCancel={onSliderPointerCancel}
      onKeyDown={onSliderKeyDown}
      className={sliderClassName}
    >
      {/* фокус с клавиатуры - рамкой вокруг видимой полосы, а не всей области */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-2 h-1.5 opacity-0 ring-2 ring-ring in-focus-visible:opacity-100"
      />
    </div>
  );
}

/** Значок громкости: выключено, тихо или громко */
function VolumeIcon({ player }: VolumeProps): ReactNode {
  if (checkIsSilent(player)) {
    return <VolumeX className="size-4" />;
  }
  if (player.volume < QUIET_VOLUME) {
    return <Volume1 className="size-4" />;
  }
  return <Volume2 className="size-4" />;
}

/** Ползунок громкости */
function VolumeSlider({ player, className }: VolumeSliderProps): ReactNode {
  const shownVolume = player.isMuted ? 0 : player.volume;
  const fillStyle = getFillStyle(shownVolume);
  const sliderClassName = cn('volume-range h-9', className);
  const onVolumeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setVolume(Number(event.target.value));
  };
  return (
    <input
      type="range"
      aria-label="Громкость"
      min={0}
      max={1}
      step={VOLUME_STEP}
      value={shownVolume}
      onChange={onVolumeChange}
      style={fillStyle}
      className={sliderClassName}
    />
  );
}

/**
 * Громкость: на компьютере - значок (выключить звук) и ползунок рядом, на телефоне - ползунок
 * по нажатию на значок
 *
 * Где браузер не даёт менять громкость (iPhone, iPad) - её нет: там она только кнопками устройства
 */
function Volume({ player }: VolumeProps): ReactNode {
  if (!checkIsVolumeAdjustable()) {
    return null;
  }
  const isZeroVolume = player.volume === 0;
  const restoredVolume = isZeroVolume ? UNMUTE_VOLUME : player.volume;
  const isSilent = checkIsSilent(player);
  const onMuteClick = (): void => {
    setVolume(restoredVolume, !isSilent);
  };
  const muteLabel = player.isMuted ? 'Включить звук' : 'Выключить звук';
  const triggerClassName = cn(ICON_BUTTON_CLASS_NAME, 'md:hidden');
  return (
    <>
      <div className="flex items-center max-md:hidden">
        <button
          type="button"
          aria-label={muteLabel}
          onClick={onMuteClick}
          className={ICON_BUTTON_CLASS_NAME}
        >
          <VolumeIcon player={player} />
        </button>
        <VolumeSlider player={player} className="w-24" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Громкость" className={triggerClassName}>
            <VolumeIcon player={player} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="flex w-56 items-center gap-1 p-1.5">
          <button
            type="button"
            aria-label={muteLabel}
            onClick={onMuteClick}
            className={ICON_BUTTON_CLASS_NAME}
          >
            <VolumeIcon player={player} />
          </button>
          <VolumeSlider player={player} className="min-w-0 flex-1 pr-2" />
        </PopoverContent>
      </Popover>
    </>
  );
}
