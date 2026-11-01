import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { InlineTitle } from '@/features/mentions';
import { PageHeader, Loading, Button, ConfirmDialog } from '@/shared/ui';
import { Navigate, useParams } from '@tanstack/react-router';
import { useProjectTaskPage } from '../hooks/use-project-task-page';
import { ProjectTaskEditor } from './project-task-editor';

/** Настройки и удаление задачи с теми же правами, что у видео. */
export function ProjectTaskEditPage(): ReactNode {
  const { projectId, taskId } = useParams({
    from: '/app/p/$projectId/tasks/$taskId/edit',
  });
  const state = useProjectTaskPage(projectId, taskId);
  const onTitleSave = (title: string): void => {
    void state.onSave({ title }).catch(() => undefined);
  };

  if (state.isPending) {
    return <Loading className="h-60 rounded-xl" />;
  }

  if (!state.task || state.isError) {
    return (
      <p className="text-led-red">Задача не найдена или нет соединения.</p>
    );
  }

  if (!state.canEdit) {
    return (
      <Navigate
        to="/p/$projectId/tasks/$taskId"
        params={{ projectId, taskId }}
      />
    );
  }

  const crumbs = [
    ...state.crumbs,
    {
      label: state.task.title,
      link: {
        to: '/p/$projectId/tasks/$taskId' as const,
        params: { projectId, taskId },
      },
    },
  ];
  const title = (
    <InlineTitle
      value={state.task.title}
      label="Переименовать задачу"
      maxLength={120}
      onSave={onTitleSave}
    />
  );
  const deleteTitle = `Удалить задачу "${state.task.title}"?`;

  return (
    <>
      <PageHeader crumbs={crumbs} title={title} meta="Настройки задачи" />
      <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <ProjectTaskEditor
          key={taskId}
          task={state.task}
          onSave={state.onSave}
          isSaving={state.isSaving}
        />
        <div className="lg:col-span-2">
          <Button
            variant="ghost"
            className="text-led-red hover:bg-led-red/10 hover:text-led-red"
            onClick={state.onDelete}
          >
            <Trash2 data-icon="inline-start" />
            Удалить задачу
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title={deleteTitle}
        description="Задача, ее этапы и заметки будут удалены."
        confirmLabel="Удалить"
        onConfirm={state.onDeleteConfirm}
        isBusy={state.isRemoving}
      />
    </>
  );
}
