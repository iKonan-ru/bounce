import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
  Button,
} from '@/shared/ui';
import { TITLE_MAX_LENGTH } from '../constants/new-video-dialog';
import { useNewVideoDialog } from '../hooks/use-new-video-dialog';
import type { NewVideoDialogProps } from '../types/new-video-dialog';

/** Создание видео в том же окне, что и создание песни */
export function NewVideoDialog(props: NewVideoDialogProps): ReactNode {
  const state = useNewVideoDialog(props);

  return (
    <Dialog open onOpenChange={state.onOpenChange}>
      <DialogContent showCloseButton={!state.isPending}>
        <form onSubmit={state.onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новое видео</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-video-title">Название</Label>
            <Input
              id="new-video-title"
              autoFocus
              required
              maxLength={TITLE_MAX_LENGTH}
              value={state.title}
              onChange={state.onTitleChange}
              disabled={state.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={state.isPending}
              onClick={props.onClose}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={state.isSubmitDisabled}>
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
