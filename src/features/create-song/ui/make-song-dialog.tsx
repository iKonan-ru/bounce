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
import { SONG_TITLE_MAX_LENGTH } from '../constants/make-song-dialog';
import { useMakeSongDialog } from '../hooks/use-make-song-dialog';
import type { MakeSongDialogProps } from '../types/make-song-dialog';

/** "Сделать песней": окно с названием; шаблон этапов грузится, только когда окно открыли */
export function MakeSongDialog({
  note,
  onClose,
}: MakeSongDialogProps): ReactNode {
  const {
    songTitle,
    inputId,
    isBusy,
    isCreateDisabled,
    onOpenChange,
    onSubmit,
    onTitleChange,
  } = useMakeSongDialog({ note, onClose });

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
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={onClose}
            >
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
