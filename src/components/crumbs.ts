import { useQuery } from '@tanstack/react-query';
import type { Crumb } from '@/components/page';
import { projectQuery, songQuery } from '@/lib/queries';

// Путь к проекту и песне для хлебных крошек: названия берутся из уже загруженных запросов.
export function useProjectCrumbs(projectId: string): Crumb[] {
  const project = useQuery(projectQuery(projectId));
  return [
    { label: 'Проекты', link: { to: '/projects' } },
    { label: project.data?.name ?? '...', link: { to: '/p/$projectId', params: { projectId } } },
  ];
}

export function useSongCrumbs(projectId: string, songId: string): Crumb[] {
  const base = useProjectCrumbs(projectId);
  const song = useQuery(songQuery(songId));
  return [
    ...base,
    {
      label: song.data?.title ?? '...',
      link: { to: '/p/$projectId/songs/$songId', params: { projectId, songId } },
    },
  ];
}
