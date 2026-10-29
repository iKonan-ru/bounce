import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { templatesQuery, createSong } from '@/entities/song';
import { pb, queryKeys } from '@/shared/api';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { UseNewSongDialogResult } from '../types/new-song-dialog';

/** Окно новой песни: название, создание по шаблону проекта и переход на страницу песни */
export function useNewSongDialog(
  projectId: string,
  onOpenChange: (open: boolean) => void
): UseNewSongDialogResult {
  const client = useQueryClient();
  const navigate = useNavigate();
  const templates = useQuery(templatesQuery(projectId));
  const [title, setTitle] = useState('');

  const createSongMutation = useMutation({
    mutationFn: () => createSong(pb, projectId, title, templates.data ?? []),
    onSuccess: async (song) => {
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
      onOpenChange(false);
      setTitle('');
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId, songId: song.id },
      });
    },
    onError: () => {
      toast.error('Песня не создана: проверьте соединение');
    },
  });

  const hasTitle = title.trim() !== '';
  const isSubmitDisabled =
    !hasTitle || createSongMutation.isPending || templates.isPending;

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const canCreate = hasTitle && !createSongMutation.isPending;

    if (canCreate) {
      createSongMutation.mutate();
    }
  };

  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTitle(event.target.value);
  };

  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  return { title, isSubmitDisabled, onSubmit, onTitleChange, onCancelClick };
}
