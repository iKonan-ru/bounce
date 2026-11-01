import { useState } from 'react';
import { toast } from 'sonner';
import { projectQuery, ProjectDirection, useAccess } from '@/entities/project';
import {
  projectTasksQuery,
  taskStagesQuery,
  TASK_STATUS_OPTIONS,
} from '@/entities/project-task';
import type { ProjectTask, ProjectTaskStatus } from '@/entities/project-task';
import {
  applyOptimisticEdit,
  pb,
  Collections,
  savePositions,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import { comparePositions, moveItemById } from '@/shared/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Список карточек задач и их прогресс на общем кэше этапов. */
export function useProjectTasksPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/tasks' });
  const project = useQuery(projectQuery(projectId));
  const query = useQuery(projectTasksQuery(projectId));
  const stages = useQuery(taskStagesQuery(projectId));
  const access = useAccess(projectId);
  const client = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<ProjectTaskStatus | 'all'>('all');
  const tasks = query.data ?? [];
  const onReorder = (from: string, to: string): void => {
    const ordered = moveItemById(tasks, from, to);
    const positionById = new Map(
      ordered.map((task, position): [string, number] => [task.id, position])
    );
    void applyOptimisticEdit(
      client,
      QueryRoot.ProjectTasks,
      () =>
        client.setQueryData<ProjectTask[]>(
          queryKeys.projectTasks.ofProject(projectId),
          (cached) =>
            cached
              ?.map((task) => ({
                ...task,
                position: positionById.get(task.id) ?? task.position,
              }))
              .toSorted(comparePositions)
        ),
      () => savePositions(pb, Collections.ProjectTasks, ordered)
    ).catch((error: unknown) =>
      toast.error(getErrorText(error, 'Порядок не сохранился'))
    );
  };

  return {
    projectId,
    tasks,
    stages: stages.data ?? [],
    visibleTasks: tasks.filter(
      (task) => filter === 'all' || task.status === filter
    ),
    filter,
    onFilterSelect: setFilter,
    filterCounts: [
      { value: 'all' as const, label: 'Все' },
      ...TASK_STATUS_OPTIONS,
    ]
      .map((option) => ({
        ...option,
        count: tasks.filter(
          (task) => option.value === 'all' || task.status === option.value
        ).length,
      }))
      .filter((option) => option.value === 'all' || option.count > 0),
    canEdit: access.canEdit,
    isEnabled: project.data?.directions.includes(ProjectDirection.other),
    isPending: query.isPending || project.isPending || stages.isPending,
    isError: query.isError || project.isError || stages.isError,
    isCreating,
    onCreate: (): void => setIsCreating(true),
    onClose: (): void => setIsCreating(false),
    onReorder,
  };
}
