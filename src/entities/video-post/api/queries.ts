import {
  pb,
  Collections,
  getCollection,
  getProjectFilter,
  queryKeys,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { VideoPost, VideoPromo } from '../types/publication';

/** Одна запись используется и в карточке, и в контент-плане */
export function videoPostsQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.videoPosts.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.VideoPosts).getFullList<VideoPost>({
        filter: getProjectFilter(projectId),
        sort: 'scheduled_at,created',
      }),
  });
}

/** Отдельный видеопромо-план проекта */
export function videoPromoQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.videoPromo.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.PromoTemplates).getFullList<VideoPromo>({
        filter: `${getProjectFilter(projectId)} && direction = "video"`,
        sort: 'offset,created',
      }),
  });
}
