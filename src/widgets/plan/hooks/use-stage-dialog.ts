import { toast } from 'sonner';
import { updateTaskStage } from '@/entities/project-task';
import type { Substep, StagePatch, StageStatus } from '@/entities/song';
import { updateStage, CLOSED_STAGE_STATUSES } from '@/entities/song';
import { updateVideoStage } from '@/entities/video';
import { getErrorText } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { Bucket } from '@/shared/types';
import { getBucket } from '@/shared/utils';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ChecklistItem,
  StageDialogProps,
  UseStageDialogResult,
} from '../types/stage-dialog';

/** Пункт чек-листа как подэтап: без отметки - не сделан */
function convertToSubstep(item: ChecklistItem): Substep {
  return { id: item.id, title: item.title, done: item.done === true };
}

/** Окно этапа: правки сразу в кэше и на сервере, просрочка и подэтапы */
export function useStageDialog({
  stage,
  song,
  video,
  isTasks,
  projectId,
  canWork,
  onOpenChange,
}: StageDialogProps): UseStageDialogResult {
  const client = useQueryClient();
  const update = (patch: StagePatch): Promise<void> => {
    if (isTasks) {
      return updateTaskStage(client, stage.id, patch);
    }

    return video
      ? updateVideoStage(client, stage.id, patch)
      : updateStage(client, song.id, stage.id, patch);
  };
  const save = (patch: StagePatch): void => {
    void update(patch).catch((error: unknown) => {
      toast.error(getErrorText(error, SAVE_FAILED));
    });
  };
  const onStatusChange = (status: StageStatus): void => {
    save({ status });
  };
  const onAssigneesChange = (assignees: string[]): void => {
    save({ assignees });
  };
  const onDeadlineChange = (deadline: string): void => {
    save({ deadline });
  };
  const onSubstepsChange = (items: ChecklistItem[]): void => {
    save({ substeps: items.map(convertToSubstep) });
  };
  const onDoneClick = (): void => {
    onOpenChange(false);
  };

  const substeps = stage.substeps ?? [];
  const hasSubsteps = substeps.length > 0;
  const deadline = stage.deadline ?? '';
  const isClosed = CLOSED_STAGE_STATUSES.has(stage.status);
  const isOverdueBucket = getBucket(deadline, new Date()) === Bucket.Overdue;
  const isOverdue = !isClosed && isOverdueBucket;

  let stageLink: UseStageDialogResult['stageLink'];

  if (isTasks) {
    stageLink = {
      to: '/p/$projectId/tasks/stages/$stageId',
      params: { projectId, stageId: stage.id },
    };
  } else if (video) {
    stageLink = {
      to: '/p/$projectId/videos/$videoId/stages/$stageId',
      params: { projectId, videoId: video.id, stageId: stage.id },
    };
  } else {
    stageLink = {
      to: '/p/$projectId/songs/$songId/stages/$stageId',
      params: { projectId, songId: song.id, stageId: stage.id },
    };
  }

  return {
    substeps,
    isOverdue,
    deadline,
    assignees: stage.assignees ?? [],
    showSubsteps: canWork || hasSubsteps,
    substepsIdPrefix: `plan-${stage.id}`,
    stageLink,
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
    onSubstepsChange,
    onDoneClick,
  };
}
