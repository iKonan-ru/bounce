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
import { pb } from '@/lib/pb';
import { templatesQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { createSong } from '@/lib/songs';

/** Самое длинное название песни */
const TITLE_MAX_LENGTH = 200;

/** Пропсы окна новой песни */
interface NewSongDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Состояние и действия окна новой песни */
interface UseNewSongDialogResult {
  title: string;
  /** Кнопка "Создать" недоступна: нет названия, песня создаётся или шаблон ещё грузится */
  isSubmitDisabled: boolean;
  onSubmit: (event: FormEvent) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCancelClick: () => void;
}

/** Окно новой песни: название, создание по шаблону проекта и переход на страницу песни */
function useNewSongDialog(
  projectId: string,
  onOpenChange: (open: boolean) => void,
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
      await navigate({ to: '/p/$projectId/songs/$songId', params: { projectId, songId: song.id } });
    },
    onError: () => {
      toast.error('Песня не создана: проверьте соединение');
    },
  });

  const hasTitle = title.trim() !== '';
  const isSubmitDisabled = !hasTitle || createSongMutation.isPending || templates.isPending;

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

/** Новая песня: только название, этапы - из шаблона проекта, остальное - в настройках песни */
export function NewSongDialog({ projectId, open, onOpenChange }: NewSongDialogProps): ReactNode {
  const { title, isSubmitDisabled, onSubmit, onTitleChange, onCancelClick } = useNewSongDialog(
    projectId,
    onOpenChange,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новая песня</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-song-title">Название</Label>
            <Input
              id="new-song-title"
              required
              autoFocus
              maxLength={TITLE_MAX_LENGTH}
              value={title}
              onChange={onTitleChange}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancelClick}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
