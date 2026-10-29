// Фабрики параметров запросов TanStack Query. Типы результата выводит сама библиотека: в них
// зашит тип данных ключа (DataTag), и вручную их не повторить без потери этой связи.
import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import { PROJECT_EXPAND } from '../constants/queries';
import type { Project } from '../types/project';

/** Все проекты, доступные пользователю */
export const projectsQuery = queryOptions({
  queryKey: queryKeys.projects.all,
  queryFn: () =>
    getCollection(pb, Collections.Projects).getFullList<Project>({
      sort: 'name',
      expand: PROJECT_EXPAND,
    }),
});

/** Проект с людьми */
export function projectQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.projects.one(id),
    queryFn: () =>
      getCollection(pb, Collections.Projects).getOne<Project>(id, {
        expand: PROJECT_EXPAND,
      }),
  });
}
