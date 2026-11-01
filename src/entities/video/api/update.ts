import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  applyOptimisticEdit,
  savePositions,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Video, VideoStage, VideoStagePatch } from '../types/video';

/** Правка сразу видна в плане и карточке; отказ возвращает прежнее состояние */
export async function updateVideoStage(
  client: QueryClient,
  id: string,
  patch: VideoStagePatch
): Promise<void> {
  const patchVideo = (video: Video): Video => {
    const stages = video.expand?.video_stages_via_video;

    if (!stages?.some((stage) => stage.id === id)) {
      return video;
    }

    return {
      ...video,
      expand: {
        ...video.expand,
        video_stages_via_video: stages.map((stage) =>
          stage.id === id ? { ...stage, ...patch } : stage
        ),
      },
    };
  };
  await applyOptimisticEdit(
    client,
    QueryRoot.Videos,
    () =>
      client.setQueriesData<Video | Video[]>(
        { queryKey: queryKeys.videos.all },
        (data) => {
          if (!data) {
            return data;
          }

          return Array.isArray(data) ? data.map(patchVideo) : patchVideo(data);
        }
      ),
    () => getCollection(pb, Collections.VideoStages).update(id, patch)
  );
}

/** Новый порядок этапов видео: сразу в карточке и списке, потом позиции одной транзакцией */
export async function reorderVideoStages(
  client: QueryClient,
  videoId: string,
  ordered: readonly VideoStage[]
): Promise<void> {
  const positionById = new Map(
    ordered.map((stage, index): [string, number] => [stage.id, index])
  );
  // только позиции: применяется и поверх свежих данных с сервера (shared/api/optimistic.ts)
  const patchVideo = (video: Video): Video => {
    const stages = video.expand?.video_stages_via_video;

    if (video.id !== videoId || !stages) {
      return video;
    }

    return {
      ...video,
      expand: {
        ...video.expand,
        video_stages_via_video: stages.map((stage) => ({
          ...stage,
          position: positionById.get(stage.id) ?? stage.position,
        })),
      },
    };
  };
  await applyOptimisticEdit(
    client,
    QueryRoot.Videos,
    () =>
      client.setQueriesData<Video | Video[]>(
        { queryKey: queryKeys.videos.all },
        (data) => {
          if (!data) {
            return data;
          }

          return Array.isArray(data) ? data.map(patchVideo) : patchVideo(data);
        }
      ),
    () => savePositions(pb, Collections.VideoStages, ordered)
  );
}
