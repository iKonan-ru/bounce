import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Input,
  MenuSelect,
  DialogFooter,
  Button,
} from '@/shared/ui';
import {
  USER_ROLE_OPTIONS,
  USERNAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants/admin-users';
import { useNewUserDialog } from '../hooks/use-new-user-dialog';
import type { NewUserDialogProps } from '../types/admin-users';

/** Диалог новой учётной записи: 2FA человек подключит при первом входе */
export function NewUserDialog({
  open,
  onOpenChange,
}: NewUserDialogProps): ReactNode {
  const {
    username,
    name,
    password,
    role,
    isSubmitDisabled,
    onFormSubmit,
    onUsernameChange,
    onNameChange,
    onPasswordChange,
    onRoleChange,
    onCancelClick,
  } = useNewUserDialog(onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-username">
              Логин: латиница, цифры, точка, дефис
            </Label>
            <Input
              id="new-username"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              required
              maxLength={USERNAME_MAX_LENGTH}
              value={username}
              onChange={onUsernameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-name">Отображаемое имя</Label>
            <Input
              id="new-name"
              required
              maxLength={NAME_MAX_LENGTH}
              value={name}
              onChange={onNameChange}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Пароль, не короче 8 символов</Label>
            <Input
              id="new-password"
              type="text"
              autoComplete="off"
              minLength={PASSWORD_MIN_LENGTH}
              required
              value={password}
              onChange={onPasswordChange}
            />
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">Роль</span>
            <MenuSelect
              label="Роль"
              value={role}
              options={USER_ROLE_OPTIONS}
              onChange={onRoleChange}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancelClick}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
