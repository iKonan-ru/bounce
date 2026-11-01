import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { SONG_FILTER_LABEL } from '../constants/project';
import type { FilterChipProps } from '../types/project';

/** Кнопка фильтра по статусу со счётчиком песен */
export function FilterChip({
  songFilter,
  count,
  isActive,
  onSelect,
}: FilterChipProps): ReactNode {
  const chipClassName = cn(
    'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
    {
      'bg-groove font-medium text-ink': isActive,
      'text-dim hover:bg-groove/50 hover:text-ink': !isActive,
    }
  );
  const onChipClick = (): void => {
    onSelect(songFilter);
  };

  return (
    <button
      type="button"
      aria-pressed={isActive}
      data-selected={isActive}
      onClick={onChipClick}
      className={chipClassName}
    >
      {SONG_FILTER_LABEL[songFilter]}
      <span className="text-xs text-dim tabular-nums">{count}</span>
    </button>
  );
}
