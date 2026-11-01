import type { ReactNode } from 'react';
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

  if (state.isPending) {
    return <Loading className="h-40 rounded-xl" />;
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

  return (
    <>
      <PageHeader crumbs={crumbs} title="Настройки задачи" />
      <ProjectTaskEditor
        key={taskId}
        task={state.task}
        onSave={state.onSave}
        isSaving={state.isSaving}
      />
      <div className="mt-10">
        <Button
          variant="ghost"
          className="text-led-red hover:bg-led-red/10 hover:text-led-red"
          onClick={state.onDelete}
        >
          Удалить задачу
        </Button>
      </div>
      <ConfirmDialog
        open={state.isConfirming}
        onOpenChange={state.setIsConfirming}
        title="Удалить задачу?"
        description="Задача, ее этапы и заметки будут удалены."
        confirmLabel="Удалить"
        onConfirm={state.onDeleteConfirm}
        isBusy={state.isRemoving}
      />
    </>
  );
}
