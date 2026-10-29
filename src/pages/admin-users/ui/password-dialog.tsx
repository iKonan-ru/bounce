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
import { PASSWORD_MIN_LENGTH } from '../constants/admin-users';
import type { PasswordDialogProps } from '../types/admin-users';

/** Диалог нового пароля для пользователя */
export function PasswordDialog({
  user,
  isOpen,
  password,
  isBusy,
  isPasswordValid,
  onDialogOpenChange,
  onPasswordChange,
  onPasswordSubmit,
  onCancelClick,
}: PasswordDialogProps): ReactNode {
  const passwordInputId = `pw-${user.id}`;
  const isSubmitDisabled = isBusy || !isPasswordValid;

  return (
    <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
      <DialogContent>
        <form onSubmit={onPasswordSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый пароль для {user.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={passwordInputId}>Не короче 8 символов</Label>
            <Input
              id={passwordInputId}
              type="text"
              autoComplete="off"
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={onPasswordChange}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={onCancelClick}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Задать пароль
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
