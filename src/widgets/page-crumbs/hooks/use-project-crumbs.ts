import { projectQuery, ProjectDirection } from '@/entities/project';
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
    const isVideo = direction === ProjectDirection.video;
    crumbs.push({
      label: isVideo ? 'Видео' : 'Музыка',
      link: {
        to: isVideo ? '/p/$projectId/videos' : '/p/$projectId/songs',
        params: { projectId },
      },
    });
  }

  return crumbs;
}
