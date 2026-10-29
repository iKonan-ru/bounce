import { toast } from 'sonner';
import type { Substep, StagePatch, StageStatus } from '@/entities/song';
import { updateStage, CLOSED_STAGE_STATUSES } from '@/entities/song';
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
  projectId,
  canWork,
  onOpenChange,
}: Omit<StageDialogProps, 'open'>): UseStageDialogResult {
  const client = useQueryClient();
  const save = (patch: StagePatch): void => {
    void updateStage(client, song.id, stage.id, patch).catch(
      (error: unknown) => {
        toast.error(getErrorText(error, SAVE_FAILED));
      }
    );
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

  return {
    substeps,
    isOverdue,
    deadline,
    assignees: stage.assignees ?? [],
    showSubsteps: canWork || hasSubsteps,
    substepsIdPrefix: `plan-${stage.id}`,
    stageLinkParams: { projectId, songId: song.id, stageId: stage.id },
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
    onSubstepsChange,
    onDoneClick,
  };
}
