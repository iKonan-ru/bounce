import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAccess, projectQuery, ProjectDirection } from '@/entities/project';
import type { ProjectTask } from '@/entities/project-task';
import { projectTasksQuery, taskStagesQuery } from '@/entities/project-task';
import {
  applyOptimisticEdit,
  pb,
  Collections,
  savePositions,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import { comparePositions, moveItemById } from '@/shared/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { TASK_FILTERS } from '../constants/project-tasks';
import type { ProjectTaskFilter } from '../types/project-task';

/** Карточки задач и режим порядка по образцу списка видео */
export function useProjectTasksPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/tasks' });
  const project = useQuery(projectQuery(projectId));
  const query = useQuery(projectTasksQuery(projectId));
  const stages = useQuery(taskStagesQuery(projectId));
  const access = useAccess(projectId);
  const client = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const onCreate = (): void => setIsCreating(true);
  const onClose = (): void => setIsCreating(false);
  const tasks = query.data ?? [];
  const isEnabled = project.data?.directions.includes(ProjectDirection.other);
  const [filter, setFilter] = useState<ProjectTaskFilter>('all');
  const [orderingTasks, setOrderingTasks] = useState<ProjectTask[] | null>(
    null
  );
  const orderingTasksRef = useRef(orderingTasks);
  orderingTasksRef.current = orderingTasks;
  const listRef = useRef<HTMLDivElement>(null);
  const orderToggleRef = useRef<HTMLButtonElement>(null);
  const isOrdering = orderingTasks !== null;

  // useCallback нужен для корректности: функция - зависимость эффектов ниже, и с новой ссылкой
  // на каждой отрисовке эффект ухода со страницы применял бы порядок при каждой отрисовке
  const handleOrderApply = useCallback((): void => {
    const ordered = orderingTasksRef.current;
    setOrderingTasks(null);

    if (!ordered) {
      return;
    }

    const isUnchanged = ordered.every((task, index) => task.position === index);

    if (isUnchanged) {
      return;
    }

    orderingTasksRef.current = null;
    const queryKey = projectTasksQuery(projectId).queryKey;
    const positionById = new Map(
      ordered.map((task, index): [string, number] => [task.id, index])
    );
    // только позиции: применяется и поверх свежих данных с сервера (shared/api/optimistic.ts)
    void applyOptimisticEdit(
      client,
      QueryRoot.ProjectTasks,
      () =>
        client.setQueryData<ProjectTask[]>(queryKey, (cached) =>
          cached
            ?.map((task) => ({
              ...task,
              position: positionById.get(task.id) ?? task.position,
            }))
            .toSorted(comparePositions)
        ),
      () => savePositions(pb, Collections.ProjectTasks, ordered)
    ).catch(() => toast.error('Порядок не сохранился: проверьте соединение'));
  }, [client, projectId]);

  useEffect(() => {
    if (!isOrdering) {
      return;
    }

    const onDocumentPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const isInList = listRef.current?.contains(target);
      const isOnToggle = orderToggleRef.current?.contains(target);
      const isInside = isInList || isOnToggle;

      if (isInside) {
        return;
      }

      handleOrderApply();
    };
    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleOrderApply();
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    return (): void => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isOrdering, handleOrderApply]);

  // ушли со страницы, не нажав "Готово" - порядок всё равно сохраняется
  useEffect(
    () => (): void => {
      handleOrderApply();
    },
    [handleOrderApply]
  );

  const visibleTasks =
    orderingTasks ??
    tasks.filter((task) => filter === 'all' || task.status === filter);
  const filterCounts = TASK_FILTERS.map((option) => ({
    ...option,
    count: tasks.filter(
      (task) => option.value === 'all' || task.status === option.value
    ).length,
  })).filter((option) => option.value === 'all' || option.count > 0);
  const onOrderToggle = (): void => {
    if (isOrdering) {
      handleOrderApply();

      return;
    }

    setFilter('all');
    setOrderingTasks(tasks);
  };
  const onReorder = (from: string, to: string): void => {
    setOrderingTasks((current) =>
      current ? moveItemById(current, from, to) : current
    );
  };

  return {
    projectId,
    tasks,
    stages: stages.data ?? [],
    visibleTasks,
    filter,
    filterCounts,
    onFilterSelect: setFilter,
    isOrdering,
    canOrder: access.canEdit && tasks.length > 1,
    listRef,
    orderToggleRef,
    onOrderToggle,
    canEdit: access.canEdit,
    isPending: query.isPending || project.isPending || stages.isPending,
    isError: query.isError || project.isError || stages.isError,
    isEnabled,
    isCreating,
    onCreate,
    onClose,
    onReorder,
  };
}
