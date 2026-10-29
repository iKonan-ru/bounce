import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Note } from '@/lib/model';
import { pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { createSongFromNote, getTitleFromNote } from '@/lib/songs';

/** Самое длинное название песни */
const SONG_TITLE_MAX_LENGTH = 200;

/** Пропсы окна "Сделать песней" */
interface MakeSongDialogProps {
  note: Note;
  onClose: () => void;
}

/** Состояние и обработчики окна "Сделать песней" */
interface UseMakeSongDialogResult {
  songTitle: string;
  inputId: string;
  isBusy: boolean;
  isCreateDisabled: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Логика окна "Сделать песней": название, шаблон этапов и создание песни */
function useMakeSongDialog({ note, onClose }: MakeSongDialogProps): UseMakeSongDialogResult {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [songTitle, setSongTitle] = useState(() => getTitleFromNote(note.text));
  const templates = useQuery(templatesQuery(note.project));
  const makeSong = useMutation({
    mutationFn: () => createSongFromNote(pb, note, songTitle.trim(), templates.data ?? []),
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
  const isCreateDisabled = [isBusy, !hasTitle, templates.isPending].some(Boolean);
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

  return { songTitle, inputId, isBusy, isCreateDisabled, onOpenChange, onSubmit, onTitleChange };
}

/** "Сделать песней": окно с названием; шаблон этапов грузится, только когда окно открыли */
export function MakeSongDialog({ note, onClose }: MakeSongDialogProps): ReactNode {
  const { songTitle, inputId, isBusy, isCreateDisabled, onOpenChange, onSubmit, onTitleChange } =
    useMakeSongDialog({ note, onClose });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Новая песня</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>Название</Label>
            <Input
              id={inputId}
              required
              autoFocus
              maxLength={SONG_TITLE_MAX_LENGTH}
              value={songTitle}
              onChange={onTitleChange}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isCreateDisabled}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
