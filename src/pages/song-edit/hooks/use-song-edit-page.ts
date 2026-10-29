import { toast } from 'sonner';
import { useAccess } from '@/entities/project';
import type { Song } from '@/entities/song';
import { songQuery } from '@/entities/song';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useSongCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { UseSongEditPageResult } from '../types/song-edit';

/** Песня, права и переименование */
export function useSongEditPage(): UseSongEditPageResult {
  const { projectId, songId } = useParams({
    from: '/app/p/$projectId/songs/$songId/edit',
  });
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const client = useQueryClient();
  const rename = useMutation({
    mutationFn: (title: string): Promise<Song> =>
      getCollection(pb, Collections.Songs).update(songId, { title }),
    onSettled: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Название не сохранилось: проверьте соединение');
    },
  });

  const onTitleSave = (title: string): void => {
    rename.mutate(title);
  };

  // настройки песни - только редакторам; остальных - на страницу песни
  const hasRole = Boolean(access.role);
  const shouldRedirect = hasRole && !access.canEdit;

  return {
    projectId,
    songId,
    crumbs,
    shouldRedirect,
    isPending: song.isPending,
    song: song.data,
    onTitleSave,
  };
}
