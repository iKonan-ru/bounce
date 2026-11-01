import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getProjectFilter,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { OtherStage } from '../types/other';

/** Этапы непосредственно в проекте */
export function otherStagesQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.otherStages.ofProject(projectId),
    queryFn: ({ signal }) =>
      getCollection(pb, Collections.OtherStages).getFullList<OtherStage>({
        signal,
        filter: getProjectFilter(projectId),
        sort: 'position,created',
      }),
  });
}
