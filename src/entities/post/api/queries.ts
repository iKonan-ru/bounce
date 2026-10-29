import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  getProjectFilter,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { PromoStep, Post } from '../types/post';

/** Промо-план проекта - по дням от релиза */
export function promoQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.promo.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.PromoTemplates).getFullList<PromoStep>({
        filter: getProjectFilter(projectId),
        sort: 'offset,created',
      }),
  });
}

/** Контент-план проекта: все публикации */
export function postsQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.posts.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.Posts).getFullList<Post>({
        filter: getProjectFilter(projectId),
        sort: 'created',
      }),
  });
}
