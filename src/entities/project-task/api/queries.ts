import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getProjectFilter,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import type { ProjectTask, TaskStage } from '../types/project-task';

/** Этапы карточек задач проекта */
export function taskStagesQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.taskStages.ofProject(projectId),
    queryFn: ({ signal }) =>
      getCollection(pb, Collections.OtherStages).getFullList<TaskStage>({
        signal,
        filter: getProjectFilter(projectId),
        sort: 'position,created',
        expand: 'project_task',
      }),
  });
}

/** Карточки задач проекта; этапы используют общий кэш со страницей плана. */
export function projectTasksQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.projectTasks.ofProject(projectId),
    queryFn: ({ signal }) =>
      getCollection(pb, Collections.ProjectTasks).getFullList<ProjectTask>({
        signal,
        filter: getProjectFilter(projectId),
        sort: 'position,-created',
      }),
  });
}
