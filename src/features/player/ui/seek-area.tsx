import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { useSeekArea } from '../hooks/use-seek-area';
import type { SeekAreaProps } from '../types/mini-player';

/**
 * Перемотка: невидимая область от низа кнопок до промежутка под плеером (24px), а видимая
 * полоса остаётся тонкой
 *
 * Своя, а не <input type="range">: на iPhone ползунок двигается только за бегунок, нажатие на
 * шкалу его не переносит, а здесь бегунка не видно. Пока тянут, ход и время показывают, куда
 * тянут; перематывается, когда отпустили
 */
export function SeekArea({
  label,
  duration,
  current,
  onScrub,
}: SeekAreaProps): ReactNode {
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
    { 'cursor-pointer': isReady }
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
