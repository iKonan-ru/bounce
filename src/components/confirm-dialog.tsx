import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Пропсы окна подтверждения */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Подпись кнопки подтверждения - само действие ("Удалить") */
  confirmLabel: string;
  /** Действие выполняется: кнопки недоступны */
  isBusy?: boolean;
  onConfirm: () => void;
}

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
