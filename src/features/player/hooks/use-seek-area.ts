import type { PointerEvent, KeyboardEvent } from 'react';
import { SEEK_SHIFT_BY_KEY } from '../constants/mini-player';
import { seekTo, formatTime } from '../store/player';
import type {
  UseSeekAreaParams,
  UseSeekAreaResult,
} from '../types/mini-player';

/** Куда указывает палец или мышь на полосе перемотки, 0..1 */
function getPointerFraction(event: PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();

  return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
}

/** Перемотка: пока тянут - показывает, куда тянут; перематывает, когда отпустили */
export function useSeekArea({
  duration,
  current,
  onScrub,
}: UseSeekAreaParams): UseSeekAreaResult {
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
