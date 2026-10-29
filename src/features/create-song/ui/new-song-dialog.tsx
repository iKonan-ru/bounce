import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Input,
  DialogFooter,
  Button,
} from '@/shared/ui';
import { TITLE_MAX_LENGTH } from '../constants/new-song-dialog';
import { useNewSongDialog } from '../hooks/use-new-song-dialog';
import type { NewSongDialogProps } from '../types/new-song-dialog';

/** Новая песня: только название, этапы - из шаблона проекта, остальное - в настройках песни */
export function NewSongDialog({
  projectId,
  open,
  onOpenChange,
}: NewSongDialogProps): ReactNode {
  const { title, isSubmitDisabled, onSubmit, onTitleChange, onCancelClick } =
    useNewSongDialog(projectId, onOpenChange);

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
