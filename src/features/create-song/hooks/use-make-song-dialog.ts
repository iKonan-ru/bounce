import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  getTitleFromNote,
  templatesQuery,
  createSongFromNote,
} from '@/entities/song';
import { pb, queryKeys } from '@/shared/api';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type {
  MakeSongDialogProps,
  UseMakeSongDialogResult,
} from '../types/make-song-dialog';

/** Логика окна "Сделать песней": название, шаблон этапов и создание песни */
export function useMakeSongDialog({
  note,
  onClose,
}: MakeSongDialogProps): UseMakeSongDialogResult {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [songTitle, setSongTitle] = useState(() => getTitleFromNote(note.text));
  const templates = useQuery(templatesQuery(note.project));
  const makeSong = useMutation({
    mutationFn: () =>
      createSongFromNote(pb, note, songTitle.trim(), templates.data ?? []),
    onSuccess: async (song) => {
      onClose();
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.notes.all }),
        client.invalidateQueries({ queryKey: queryKeys.songs.all }),
      ]);
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId: note.project, songId: song.id },
      });
    },
    onError: () => {
      toast.error('Песня не создана: проверьте соединение');
    },
  });
  const isBusy = makeSong.isPending;
  const hasTitle = songTitle.trim() !== '';
  const isCreateDisabled = [isBusy, !hasTitle, templates.isPending].some(
    Boolean
  );
  const inputId = `song-from-${note.id}`;

  const onOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (hasTitle) {
      makeSong.mutate();
    }
  };
  const onTitleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSongTitle(event.target.value);
  };

  return {
    songTitle,
    inputId,
    isBusy,
    isCreateDisabled,
    onOpenChange,
    onSubmit,
    onTitleChange,
  };
}
