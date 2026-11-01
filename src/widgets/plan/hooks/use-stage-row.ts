import { useState } from 'react';
import { toast } from 'sonner';
import { getPeopleById, useProjectPeople } from '@/entities/project';
import { updateTaskStage } from '@/entities/project-task';
import type { StagePatch, Substep } from '@/entities/song';
import { StageStatus, updateStage, STAGE_STATUS_LABEL } from '@/entities/song';
import { updateVideoStage } from '@/entities/video';
import { getErrorText } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useLeaving } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { PlanItemKind } from '../types/plan';
import type { PlanStage, PlanVideoStage, PlanTaskStage } from '../types/plan';
import type { UseStageRowResult } from '../types/stage-row';

/** Строка этапа: отметка "готово" с отменой в тосте, подэтапы и подробности под названием */
export function useStageRow(
  item: PlanStage | PlanVideoStage | PlanTaskStage,
  projectId: string
): UseStageRowResult {
  const client = useQueryClient();
  const people = getPeopleById(useProjectPeople(projectId));
  const { stage } = item;
  const [isOpen, setIsOpen] = useState(false);
  const { isLeaving, leave } = useLeaving();
  const substeps = stage.substeps ?? [];
  const hasSubsteps = substeps.length > 0;
  const assignees = item.assignees.flatMap(
    (userId) => people.get(userId) ?? []
  );
  const isInProgress = stage.status === StageStatus.in_progress;
  const doneLabel = `${stage.title}: готово`;

  const save = (patch: StagePatch): Promise<void> => {
    if (item.kind === PlanItemKind.TaskStage) {
      return updateTaskStage(client, stage.id, patch);
    }

    return item.kind === PlanItemKind.VideoStage
      ? updateVideoStage(client, stage.id, patch)
      : updateStage(client, item.song.id, stage.id, patch);
  };

  const handleFinish = (): void => {
    const previousStatus = stage.status;
    const onUndoClick = (): void => {
      void save({ status: previousStatus }).catch(console.error);
    };
    const showDoneToast = (): void => {
      toast(doneLabel, { action: { label: 'Отменить', onClick: onUndoClick } });
    };
    save({ status: StageStatus.done })
      .then(showDoneToast)
      .catch((error: unknown) => {
        toast.error(getErrorText(error, SAVE_FAILED));
      });
  };

  const onDoneChange = (isDone: boolean): void => {
    if (isDone) {
      leave(handleFinish);
    }
  };

  const onSubstepsToggleClick = (): void => {
    setIsOpen(!isOpen);
  };

  const onSubstepCheckedChange = (substepId: string, isDone: boolean): void => {
    const updateSubstep = (substep: Substep): Substep => {
      if (substep.id !== substepId) {
        return substep;
      }

      return { ...substep, done: isDone };
    };
    void save({ substeps: substeps.map(updateSubstep) }).catch(
      (error: unknown) => {
        toast.error(getErrorText(error, SAVE_FAILED));
      }
    );
  };

  const statusDetail = isInProgress
    ? STAGE_STATUS_LABEL[StageStatus.in_progress]
    : '';
  const doneSubstepsCount = substeps.filter((substep) => substep.done).length;
  const substepsProgress = `${doneSubstepsCount}/${substeps.length}`;
  const substepsDetail = hasSubsteps ? substepsProgress : '';
  let sourceTitle =
    item.kind === PlanItemKind.TaskStage
      ? (item.stage.expand?.project_task?.title ?? 'Задачи')
      : 'Задачи';

  if (item.kind === PlanItemKind.VideoStage) {
    sourceTitle = item.video.title;
  } else if (item.kind === PlanItemKind.Stage) {
    sourceTitle = item.song.title;
  }

  const [firstDetail, ...restDetails] = [
    sourceTitle,
    statusDetail,
    substepsDetail,
  ].filter(Boolean);
  const hasRestDetails = restDetails.length > 0;
  const restDetailsText = ` \u00B7 ${restDetails.join(' \u00B7 ')}`;

  return {
    substeps,
    hasSubsteps,
    assignees,
    isOpen,
    isLeaving,
    isInProgress,
    doneLabel,
    firstDetail,
    hasRestDetails,
    restDetailsText,
    onDoneChange,
    onSubstepsToggleClick,
    onSubstepCheckedChange,
  };
}
