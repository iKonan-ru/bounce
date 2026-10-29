import { VolumeX, Volume1, Volume2 } from 'lucide-react';
import type { ReactNode, ChangeEvent } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui';
import { cn } from '@/shared/utils';
import {
  PERCENT,
  QUIET_VOLUME,
  VOLUME_STEP,
  UNMUTE_VOLUME,
  ICON_BUTTON_CLASS_NAME,
} from '../constants/mini-player';
import { setVolume, checkIsVolumeAdjustable } from '../store/player';
import type {
  FillStyle,
  VolumeProps,
  VolumeSliderProps,
} from '../types/mini-player';
import type { PlayerState } from '../types/player';

/** Заполненная часть шкалы громкости (.volume-range в index.css) */
function getFillStyle(volume: number): FillStyle {
  return { '--fill': `${Math.round(volume * PERCENT)}%` };
}

/** Звук выключен или громкость на нуле */
function checkIsSilent(player: PlayerState): boolean {
  return player.isMuted || player.volume === 0;
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
export function Volume({ player }: VolumeProps): ReactNode {
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
          <button
            type="button"
            aria-label="Громкость"
            className={triggerClassName}
          >
            <VolumeIcon player={player} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="flex w-56 items-center gap-1 p-1.5"
        >
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
