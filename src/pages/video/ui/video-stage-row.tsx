import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { AvatarStack } from '@/entities/project';
import {
  StatusDot,
  STAGE_STATUS_LABEL,
  CLOSED_STAGE_STATUSES,
  StageStatus,
  TEXT_CLASS,
} from '@/entities/song';
import { getDateLabel, checkIsOverdue, cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import type { VideoStageRowProps } from '../types/video';

/** Этап открывается отдельной страницей, как у песни */
export function VideoStageRow({
  stage,
  projectId,
  videoId,
  handle,
  canEdit,
  people,
}: VideoStageRowProps): ReactNode {
  const params = { projectId, videoId, stageId: stage.id };
  const done = (stage.substeps ?? []).filter((item) => item.done).length;
  const count = stage.substeps?.length ?? 0;
  const details = [
    count > 0 ? `${done}/${count}` : '',
    stage.deadline ? `до ${getDateLabel(stage.deadline)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const isLate =
    Boolean(stage.deadline) &&
    !CLOSED_STAGE_STATUSES.has(stage.status) &&
    checkIsOverdue(stage.deadline);
  const assignees = (stage.assignees ?? []).flatMap(
    (id) => people.get(id) ?? []
  );
  const rowClassName = cn(
    'group/row flex items-center transition-colors hover:bg-groove/30',
    { 'pl-1': canEdit, 'pl-4': !canEdit }
  );
  const titleClassName = cn('block truncate', {
    'text-dim line-through': stage.status === StageStatus.skipped,
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
        to="/p/$projectId/videos/$videoId/stages/$stageId"
        params={params}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 md:min-h-11"
      >
        <StatusDot status={stage.status} />
        <span className="min-w-0 flex-1">
          <span className={titleClassName}>{stage.title}</span>
          {details && <span className={detailsClassName}>{details}</span>}
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
