import type { ReactNode } from 'react';
import type { ProjectTaskStatus } from '@/entities/project-task';
import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import { GROUP_ROWS } from '@/shared/constants';
import { Section, PropRow, MenuSelect } from '@/shared/ui';
import type { ProjectTaskEditorProps } from '../types/project-task';

/** Настройки по образцу редактора видео. */
export function ProjectTaskEditor(props: ProjectTaskEditorProps): ReactNode {
  const onStatusChange = (status: ProjectTaskStatus): void => {
    void props.onSave({ status }).catch(() => undefined);
  };

  return (
    <Section title="Задача">
      <div className={GROUP_ROWS}>
        <PropRow label="Статус">
          <MenuSelect
            label="Статус задачи"
            value={props.task.status}
            options={TASK_STATUS_OPTIONS}
            onChange={onStatusChange}
            disabled={props.isSaving}
          />
        </PropRow>
      </div>
    </Section>
  );
}
