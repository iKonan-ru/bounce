import type { ReactNode } from 'react';

/** Пропсы окна подтверждения */
export interface ConfirmDialogProps {
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
