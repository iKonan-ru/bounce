import { useState } from 'react';
import { toast } from 'sonner';
import {
  ProjectDirection,
  useAccess,
  getPeopleById,
  useProjectPeople,
} from '@/entities/project';
import {
  projectTasksQuery,
  taskStagesQuery,
  reorderTaskStages,
} from '@/entities/project-task';
import type { ProjectTaskPatch } from '@/entities/project-task';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { getNextPosition, moveItemById } from '@/shared/utils';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

/** Карточка задачи с независимым набором этапов. */
export function useProjectTaskPage(projectId: string, taskId: string) {
  const query = useQuery(projectTasksQuery(projectId));
  const stagesQuery = useQuery(taskStagesQuery(projectId));
  const client = useQueryClient();
  const navigate = useNavigate();
  const access = useAccess(projectId);
  const people = getPeopleById(useProjectPeople(projectId));
  const crumbs = useProjectCrumbs(projectId, ProjectDirection.other);
  const [isConfirming, setIsConfirming] = useState(false);
  const task = query.data?.find((item) => item.id === taskId);
  const stages = (stagesQuery.data ?? []).filter(
    (stage) => stage.project_task === taskId
  );
  const refresh = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.projectTasks.all }),
      client.invalidateQueries({ queryKey: queryKeys.taskStages.all }),
    ]);
  };
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Изменения не сохранены'));
  };
  const save = useMutation({
    scope: { id: `project-task:${taskId}` },
    mutationFn: (patch: ProjectTaskPatch) =>
      getCollection(pb, Collections.ProjectTasks).update(taskId, patch),
    onSuccess: refresh,
    onError,
  });
  const onSave = async (patch: ProjectTaskPatch): Promise<void> => {
    await save.mutateAsync(patch);
  };
  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.OtherStages).create({
        project: projectId,
        project_task: taskId,
        title,
        status: 'not_started',
        position: getNextPosition(stages),
        substeps: [],
      }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.ProjectTasks).delete(taskId),
    onSuccess: async () => {
      await refresh();
      await navigate({ to: '/p/$projectId/tasks', params: { projectId } });
    },
    onError,
  });
  const onReorder = (from: string, to: string): void => {
    void reorderTaskStages(client, moveItemById(stages, from, to)).catch(
      onError
    );
  };

  return {
    projectId,
    taskId,
    task,
    stages,
    crumbs,
    people,
    canEdit: access.canEdit,
    isPending: query.isPending || stagesQuery.isPending,
    isError: query.isError || stagesQuery.isError,
    onSave,
    isSaving: save.isPending,
    onStageAdd: (title: string): Promise<unknown> => add.mutateAsync(title),
    isAdding: add.isPending,
    onReorder,
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    onDelete: (): void => setIsConfirming(true),
    onDeleteConfirm: (): void => remove.mutate(),
  };
}
