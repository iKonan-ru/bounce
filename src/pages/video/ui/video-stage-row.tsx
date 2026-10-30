import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusDot, STAGE_STATUS_LABEL } from '@/entities/song';
import { getDateLabel } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import type { VideoStageRowProps } from '../types/video';

/** Этап открывается отдельной страницей, как у песни */
export function VideoStageRow({
  stage,
  projectId,
  videoId,
  handle,
}: VideoStageRowProps): ReactNode {
  const params = { projectId, videoId, stageId: stage.id };
  const done = (stage.substeps ?? []).filter((item) => item.done).length;
  const count = stage.substeps?.length ?? 0;
  const details = [
    count > 0 ? `${done}/${count}` : '',
    stage.deadline ? getDateLabel(stage.deadline) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="group/row flex items-center px-2 hover:bg-groove/30">
      {handle}
      <Link
        to="/p/$projectId/videos/$videoId/stages/$stageId"
        params={params}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-2 py-2.5"
      >
        <StatusDot status={stage.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{stage.title}</span>
          {details && <span className="text-xs text-dim">{details}</span>}
        </span>
        <span className="text-xs text-dim">
          {STAGE_STATUS_LABEL[stage.status]}
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim" />
      </Link>
    </div>
  );
}
