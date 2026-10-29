import { useState } from 'react';
import { toast } from 'sonner';
import { getPeopleById, useProjectPeople } from '@/entities/project';
import type { StagePatch, Substep } from '@/entities/song';
import { StageStatus, updateStage, STAGE_STATUS_LABEL } from '@/entities/song';
import { getErrorText } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useLeaving } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { PlanStage } from '../types/plan';
import type { UseStageRowResult } from '../types/stage-row';

/** Строка этапа: отметка "готово" с отменой в тосте, подэтапы и подробности под названием */
export function useStageRow(
  item: PlanStage,
  projectId: string
): UseStageRowResult {
  const client = useQueryClient();
  const people = getPeopleById(useProjectPeople(projectId));
  const { stage, song } = item;
  const [isOpen, setIsOpen] = useState(false);
  const { isLeaving, leave } = useLeaving();
  const substeps = stage.substeps ?? [];
  const hasSubsteps = substeps.length > 0;
  const assignees = item.assignees.flatMap(
    (userId) => people.get(userId) ?? []
  );
  const isInProgress = stage.status === StageStatus.in_progress;
  const doneLabel = `${stage.title}: готово`;

  const save = (patch: StagePatch): Promise<void> =>
    updateStage(client, song.id, stage.id, patch);

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
  const [firstDetail, ...restDetails] = [
    song.title,
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
