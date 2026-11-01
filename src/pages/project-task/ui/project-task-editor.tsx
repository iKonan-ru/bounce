import type { ReactNode } from 'react';
import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import { GROUP_ROWS } from '@/shared/constants';
import { Section, PropRow, Input, MenuSelect, Button } from '@/shared/ui';
import { useProjectTaskEditor } from '../hooks/use-project-task-editor';
import type { ProjectTaskEditorProps } from '../types/project-task';

/** Настройки по образцу редактора видео. */
export function ProjectTaskEditor(props: ProjectTaskEditorProps): ReactNode {
  const state = useProjectTaskEditor(props);

  return (
    <form onSubmit={state.onSubmit} className="flex flex-col gap-8">
      <Section title="Основное">
        <div className={GROUP_ROWS}>
          <PropRow label="Название">
            <Input
              aria-label="Название задачи"
              value={state.title}
              onChange={state.onTitleChange}
              maxLength={120}
              required
              disabled={props.isSaving}
            />
          </PropRow>
          <PropRow label="Статус">
            <MenuSelect
              label="Статус задачи"
              value={state.status}
              options={TASK_STATUS_OPTIONS}
              onChange={state.onStatusChange}
              disabled={props.isSaving}
            />
          </PropRow>
        </div>
      </Section>
      <div className="flex justify-end">
        <Button type="submit" disabled={!state.canSave}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
