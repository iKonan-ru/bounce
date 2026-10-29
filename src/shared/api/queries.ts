import { queryOptions } from '@tanstack/react-query';
import { FILE_TOKEN_REFRESH_MS } from '../constants/queries';
import { pb } from './pb';
import { queryKeys } from './query-keys';

/** Фильтр по проекту */
export function getProjectFilter(projectId: string): string {
  return pb.filter('project = {:project}', { project: projectId });
}

/** Токен для ссылок на закрытые файлы */
export const fileTokenQuery = queryOptions({
  queryKey: queryKeys.fileToken,
  queryFn: () => pb.files.getToken(),
  staleTime: FILE_TOKEN_REFRESH_MS,
  refetchInterval: FILE_TOKEN_REFRESH_MS,
});
