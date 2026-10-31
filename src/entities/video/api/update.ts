import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  applyOptimisticEdit,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Video, VideoStagePatch } from '../types/video';

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
