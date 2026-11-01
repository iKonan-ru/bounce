import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { ProjectTaskStatus } from '@/entities/project-task';
import type { ProjectTaskEditorProps } from '../types/project-task';

/** Явное сохранение названия и состояния карточки. */
export function useProjectTaskEditor({
  task,
  onSave,
  isSaving,
}: ProjectTaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<ProjectTaskStatus>(task.status);
  const canSave = Boolean(title.trim()) && !isSaving;
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (canSave) {
      void onSave(title.trim(), status).catch(() => undefined);
    }
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void =>
    setTitle(event.target.value);

  return {
    title,
    status,
    onTitleChange,
    onStatusChange: setStatus,
    canSave,
    onSubmit,
  };
}
