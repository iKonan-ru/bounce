import type { SongStage, StageStatus } from '@/entities/song';
import { CLOSED_STAGE_STATUSES } from '@/entities/song';
import { checkIsOverdue } from '@/shared/utils';
import type { StageFieldsProps, UseStageFieldsResult } from '../types/stage';

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

/** Правка статуса, исполнителей и срока этапа */
export function useStageFields(
  stage: SongStage,
  onSave: StageFieldsProps['onSave']
): UseStageFieldsResult {
  const onStatusChange = (status: StageStatus): void => {
    onSave({ status });
  };

  const onAssigneesChange = (ids: string[]): void => {
    onSave({ assignees: ids });
  };

  const onDeadlineChange = (day: string): void => {
    onSave({ deadline: day });
  };

  return {
    assignees: stage.assignees ?? [],
    deadline: stage.deadline ?? '',
    isLate: checkIsStageLate(stage),
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
  };
}
