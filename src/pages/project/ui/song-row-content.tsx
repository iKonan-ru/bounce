import { GripVertical, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Song } from '@/entities/song';
import {
  getSongProgress,
  Meter,
  getOrderedStages,
  getCurrentStage,
  SONG_STATUS_LABEL,
  getSongStatus,
  SongCover,
} from '@/entities/song';
import { getDateLabel, cn } from '@/shared/utils';
import type { SongProgressProps, SongRowContentProps } from '../types/project';

/** Подпись даты релиза; не назначена - пустая строка */
function getReleaseLabel(song: Song): string {
  if (!song.target_release) {
    return '';
  }

  return getDateLabel(song.target_release);
}

/**
 * Прогресс песни: на телефоне и планшете - дата релиза над прогрессом; на компьютере дата -
 * колонкой
 */
function SongProgress({ stages, releaseLabel }: SongProgressProps): ReactNode {
  const hasRelease = releaseLabel !== '';
  const hasStages = stages.length > 0;

  if (!hasStages) {
    const noStagesClassName = cn({ 'max-lg:hidden': hasRelease });

    return (
      <span className="text-xs text-dim">
        {hasRelease && <span className="lg:hidden">{releaseLabel}</span>}
        <span className={noStagesClassName}>Нет этапов</span>
      </span>
    );
  }

  const progress = getSongProgress(stages);

  return (
    <>
      <span className="text-xs text-dim tabular-nums lg:order-2 lg:w-8 lg:text-right">
        {hasRelease && <span className="lg:hidden">{releaseLabel} · </span>}
        {progress.done}/{progress.total}
      </span>
      <span className="w-24 lg:order-1 lg:w-auto lg:flex-1">
        <Meter stages={stages} />
      </span>
    </>
  );
}

/** Содержимое строки песни: обложка, название, статус, текущий этап, прогресс и дата релиза */
export function SongRowContent({
  song,
  isOrdering,
}: SongRowContentProps): ReactNode {
  const stages = getOrderedStages(song);
  const currentStage = getCurrentStage(stages);
  const releaseLabel = getReleaseLabel(song);
  const statusLabel = SONG_STATUS_LABEL[getSongStatus(song)];
  const mobileSubtitle = [statusLabel, currentStage?.title]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {isOrdering && (
          <GripVertical className="-mr-1 -ml-1 size-4 shrink-0 text-dim animate-in fade-in-0 zoom-in-75" />
        )}
        <SongCover song={song} className="size-11 lg:size-10" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{song.title}</span>
          <span className="block truncate text-sm text-dim lg:hidden">
            {mobileSubtitle}
          </span>
          {currentStage && (
            <span className="hidden truncate text-sm text-dim lg:block">
              {currentStage.title}
            </span>
          )}
        </span>
      </span>
      <span className="hidden truncate text-sm text-dim lg:block">
        {statusLabel}
      </span>
      {/* справа: на телефоне и планшете - дата релиза над прогрессом; на компьютере дата - колонкой */}
      <span className="flex shrink-0 flex-col items-end gap-1 lg:w-auto lg:flex-row lg:items-center lg:gap-2">
        <SongProgress stages={stages} releaseLabel={releaseLabel} />
      </span>
      <span className="hidden text-sm text-dim lg:block">{releaseLabel}</span>
      {!isOrdering && (
        <ChevronRight className="size-4 shrink-0 text-dim/60 lg:hidden" />
      )}
    </>
  );
}
