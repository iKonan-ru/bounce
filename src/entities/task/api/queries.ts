import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { DAY_MS } from '@/shared/constants';
import { convertToPbDateTime } from '@/shared/utils';
import { queryOptions } from '@tanstack/react-query';
import { DONE_TASKS_VISIBLE_DAYS } from '../constants/queries';
import type { Task } from '../types/task';

/** Задачи планировщика: открытые и выполненные за последние две недели */
export function tasksQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.tasks.ofProject(projectId),
    queryFn: () => {
      const since = convertToPbDateTime(
        new Date(Date.now() - DONE_TASKS_VISIBLE_DAYS * DAY_MS)
      );

      return getCollection(pb, Collections.Tasks).getFullList<Task>({
        filter: pb.filter(
          'project = {:project} && (done = false || done_at >= {:since})',
          {
            project: projectId,
            since,
          }
        ),
        sort: 'created',
      });
    },
  });
}
