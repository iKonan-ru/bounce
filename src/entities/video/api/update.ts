import { pb, getCollection, Collections, queryKeys } from '@/shared/api';
import type { QueryClient } from '@tanstack/react-query';
import type { VideoStagePatch } from '../types/video';

/** План и карточка перечитывают один исходный этап после сохранения */
export async function updateVideoStage(
  client: QueryClient,
  id: string,
  patch: VideoStagePatch
): Promise<void> {
  await getCollection(pb, Collections.VideoStages).update(id, patch);
  await client.invalidateQueries({ queryKey: queryKeys.videos.all });
}
