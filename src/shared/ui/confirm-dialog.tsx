import type { ReactNode } from 'react';
import type { ConfirmDialogProps } from '../types/confirm-dialog';
import { Button } from './kit/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './kit/dialog';

/** Подтверждение необратимого действия; кнопка называет само действие */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isBusy,
  onConfirm,
}: ConfirmDialogProps): ReactNode {
  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" disabled={isBusy} onClick={onCancelClick}>
            Отмена
          </Button>
          <Button variant="destructive" disabled={isBusy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
