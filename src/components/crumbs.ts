import type { Crumb } from '@/components/page';
import { projectQuery, songQuery } from '@/lib/queries';
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

/** Путь к песне для хлебных крошек: проект, затем песня */
export function useSongCrumbs(projectId: string, songId: string): Crumb[] {
  const projectCrumbs = useProjectCrumbs(projectId);
  const song = useQuery(songQuery(songId));

  return [
    ...projectCrumbs,
    {
      label: song.data?.title ?? '...',
      link: {
        to: '/p/$projectId/songs/$songId',
        params: { projectId, songId },
      },
    },
  ];
}
