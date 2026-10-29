import { songQuery } from '@/entities/song';
import type { Crumb } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';
import { useProjectCrumbs } from './use-project-crumbs';

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
