import type { StagePatch } from '@/entities/song';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  applyOptimisticEdit,
  savePositions,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import { comparePositions } from '@/shared/utils';
import type { QueryClient } from '@tanstack/react-query';
import type { TaskStage } from '../types/project-task';

/** Правка с откатом при отказе сервера */
export async function updateTaskStage(
  client: QueryClient,
  id: string,
  patch: StagePatch
): Promise<void> {
  await applyOptimisticEdit(
    client,
    QueryRoot.TaskStages,
    () =>
      client.setQueriesData<TaskStage[]>(
        { queryKey: queryKeys.taskStages.all },
        (data) =>
          data?.map((stage) =>
            stage.id === id ? { ...stage, ...patch } : stage
          )
      ),
    () => getCollection(pb, Collections.OtherStages).update(id, patch)
  );
  await client.invalidateQueries({ queryKey: queryKeys.projectTasks.all });
}

/** Новый порядок этапов раздела: сразу в кэше, потом позиции одной транзакцией */
export async function reorderTaskStages(
  client: QueryClient,
  ordered: readonly TaskStage[]
): Promise<void> {
  const positionById = new Map(
    ordered.map((stage, index): [string, number] => [stage.id, index])
  );
  // только позиции: применяется и поверх свежих данных с сервера (shared/api/optimistic.ts)
  await applyOptimisticEdit(
    client,
    QueryRoot.TaskStages,
    () =>
      client.setQueriesData<TaskStage[]>(
        { queryKey: queryKeys.taskStages.all },
        (data) =>
          data
            ?.map((stage) => ({
              ...stage,
              position: positionById.get(stage.id) ?? stage.position,
            }))
            .toSorted(comparePositions)
      ),
    () => savePositions(pb, Collections.OtherStages, ordered)
  );
}
