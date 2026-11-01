import type { StagePatch } from '@/entities/song';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  applyOptimisticEdit,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import type { QueryClient } from '@tanstack/react-query';
import type { OtherStage } from '../types/other';

/** Правка с откатом при отказе сервера */
export async function updateOtherStage(
  client: QueryClient,
  id: string,
  patch: StagePatch
): Promise<void> {
  await applyOptimisticEdit(
    client,
    QueryRoot.OtherStages,
    () =>
      client.setQueriesData<OtherStage[]>(
        { queryKey: queryKeys.otherStages.all },
        (data) =>
          data?.map((stage) =>
            stage.id === id ? { ...stage, ...patch } : stage
          )
      ),
    () => getCollection(pb, Collections.OtherStages).update(id, patch)
  );
}
