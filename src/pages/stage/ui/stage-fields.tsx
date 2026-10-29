import type { ReactNode } from 'react';
import { PeoplePicker } from '@/entities/project';
import { StageStatusPicker } from '@/entities/song';
import { GROUP_ROWS } from '@/shared/constants';
import { PropRow, DateField } from '@/shared/ui';
import { useStageFields } from '../hooks/use-stage-fields';
import type { StageFieldsProps } from '../types/stage';

/** Свойства этапа: статус, исполнители и срок */
export function StageFields({
  projectId,
  stage,
  canWork,
  onSave,
}: StageFieldsProps): ReactNode {
  const {
    assignees,
    deadline,
    isLate,
    onStatusChange,
    onAssigneesChange,
    onDeadlineChange,
  } = useStageFields(stage, onSave);

  return (
    <div className={GROUP_ROWS}>
      <PropRow label="Статус">
        <StageStatusPicker
          value={stage.status}
          readOnly={!canWork}
          onChange={onStatusChange}
        />
      </PropRow>
      <PropRow label="Кто делает">
        <PeoplePicker
          projectId={projectId}
          value={assignees}
          disabled={!canWork}
          onChange={onAssigneesChange}
        />
      </PropRow>
      <PropRow label="Срок">
        <DateField
          isQuiet
          disabled={!canWork}
          value={deadline}
          isOverdue={isLate}
          placeholder="Без срока"
          onChange={onDeadlineChange}
        />
      </PropRow>
    </div>
  );
}
