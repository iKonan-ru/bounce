import { useState } from 'react';
import { toast } from 'sonner';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { DeleteSongProps, UseDeleteSongResult } from '../types/song-edit';

/** Удаление песни с подтверждением; после него - на страницу проекта */
export function useDeleteSong({
  projectId,
  song,
}: DeleteSongProps): UseDeleteSongResult {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.Songs).delete(song.id),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({ to: '/p/$projectId', params: { projectId } });
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: () => {
      toast.error('Песня не удалена: проверьте соединение');
    },
  });

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    remove.mutate();
  };

  return {
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    onDeleteClick,
    onDeleteConfirm,
  };
}
