import { projectQuery } from '@/entities/project';
import type { Crumb } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';

/**
 * Путь к проекту для хлебных крошек: начинается с проекта (список проектов - во вкладке и в
 * боковой панели), название берётся из уже загруженного запроса
 */
export function useProjectCrumbs(projectId: string): Crumb[] {
  const project = useQuery(projectQuery(projectId));

  return [
    {
      label: project.data?.name ?? '...',
      link: { to: '/p/$projectId', params: { projectId } },
    },
  ];
}
