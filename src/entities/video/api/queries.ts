import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getProjectFilter,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { Video } from '../types/video';

/** Видео проекта с этапами */
export function videosQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.videos.ofProject(projectId),
    queryFn: ({ signal }) =>
      getCollection(pb, Collections.Videos).getFullList<Video>({
        signal,
        filter: getProjectFilter(projectId),
        sort: 'position,-created',
        expand: 'video_stages_via_video',
      }),
  });
}

/** Карточка видео */
export function videoQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.videos.one(id),
    queryFn: ({ signal }) =>
      getCollection(pb, Collections.Videos).getOne<Video>(id, {
        signal,
        expand: 'video_stages_via_video',
      }),
  });
}
