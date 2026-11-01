import {
  projectQuery,
  DIRECTION_LABELS,
  DIRECTION_PATHS,
} from '@/entities/project';
import type { ProjectDirection } from '@/entities/project';
import type { Crumb } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';

/**
 * Путь к проекту для хлебных крошек: начинается с проекта (список проектов - во вкладке и в
 * боковой панели), название берётся из уже загруженного запроса
 */
export function useProjectCrumbs(
  projectId: string,
  direction?: ProjectDirection
): Crumb[] {
  const project = useQuery(projectQuery(projectId));

  const crumbs: Crumb[] = [
    {
      label: project.data?.name ?? '...',
      link: { to: '/p/$projectId', params: { projectId } },
    },
  ];

  if (direction) {
    crumbs.push({
      label: DIRECTION_LABELS[direction],
      link: {
        to: DIRECTION_PATHS[direction],
        params: { projectId },
      },
    });
  }

  return crumbs;
}
