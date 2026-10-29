import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { AvatarStack } from '@/entities/project';
import type { SongStage } from '@/entities/song';
import {
  CLOSED_STAGE_STATUSES,
  StageStatus,
  TEXT_CLASS,
  StatusDot,
  STAGE_STATUS_LABEL,
} from '@/entities/song';
import type { User } from '@/entities/user';
import { checkIsOverdue, getDateLabel, cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import { FACTS_SEPARATOR } from '../constants/song';
import type { SongStageRowState, SongStageRowProps } from '../types/song';

/** Срок этапа прошёл, а этап не закрыт */
function checkIsStageLate(
  stage: Pick<SongStage, 'deadline' | 'status'>
): boolean {
  if (!stage.deadline) {
    return false;
  }

  if (CLOSED_STAGE_STATUSES.has(stage.status)) {
    return false;
  }

  return checkIsOverdue(stage.deadline);
}

/** Сведения строки этапа: сделано подэтапов и срок */
function getStageDetails(stage: SongStage): string[] {
  const substeps = stage.substeps ?? [];
  const details: string[] = [];

  if (substeps.length > 0) {
    const doneCount = substeps.filter((substep) => substep.done).length;
    details.push(`${doneCount}/${substeps.length}`);
  }

  if (stage.deadline) {
    details.push(`до ${getDateLabel(stage.deadline)}`);
  }

  return details;
}

/** Сведения, срок и исполнители этапа для строки */
function getSongStageRowState(
  stage: SongStage,
  people: Map<string, User>
): SongStageRowState {
  const details = getStageDetails(stage);

  return {
    isLate: checkIsStageLate(stage),
    isSkipped: stage.status === StageStatus.skipped,
    hasDetails: details.length > 0,
    detailsText: details.join(FACTS_SEPARATOR),
    assignees: (stage.assignees ?? []).flatMap((id) => people.get(id) ?? []),
  };
}

/** Строка этапа: статус, название, сведения, исполнители; нажатие открывает этап */
export function SongStageRow({
  projectId,
  songId,
  stage,
  handle,
  canEdit,
  people,
}: SongStageRowProps): ReactNode {
  const { isLate, isSkipped, hasDetails, detailsText, assignees } =
    getSongStageRowState(stage, people);
  const linkParams = { projectId, songId, stageId: stage.id };
  const rowClassName = cn(
    'group/row flex items-center transition-colors hover:bg-groove/30',
    {
      'pl-1': canEdit,
      'pl-4': !canEdit,
    }
  );
  const titleClassName = cn('block truncate', {
    'text-dim line-through': isSkipped,
  });
  const detailsClassName = cn('block truncate text-xs', {
    'text-led-red': isLate,
    'text-dim': !isLate,
  });
  const statusClassName = cn('shrink-0 text-sm', TEXT_CLASS[stage.status]);

  return (
    <div className={rowClassName}>
      {canEdit && handle}
      <Link
        to="/p/$projectId/songs/$songId/stages/$stageId"
        params={linkParams}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 md:min-h-11"
      >
        <StatusDot status={stage.status} />
        <span className="min-w-0 flex-1">
          <span className={titleClassName}>{stage.title}</span>
          {hasDetails && (
            <span className={detailsClassName}>{detailsText}</span>
          )}
        </span>
        <AvatarStack users={assignees} />
        <span className={statusClassName}>
          {STAGE_STATUS_LABEL[stage.status]}
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim/60" />
      </Link>
    </div>
  );
}
