import type { ReactNode } from 'react';
import type { User } from '@/entities/user';
import { Avatar, ConfirmDialog } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useUserRow } from '../hooks/use-user-row';
import type { UserRowProps } from '../types/admin-users';
import { UserDialog } from '../types/admin-users';
import { PasswordDialog } from './password-dialog';
import { UserActionsMenu } from './user-actions-menu';

/** Строка признаков пользователя под именем */
function getUserStatusLine(user: User): string {
  const labels: string[] = [];
  const isCreator = !user.is_admin && user.can_create_projects;
  const totpLabel = user.totp_enabled ? '2FA подключена' : '2FA не подключена';

  if (user.disabled) {
    labels.push('Отключён');
  }

  if (user.is_admin) {
    labels.push('Главный');
  }

  if (isCreator) {
    labels.push('Создаёт проекты');
  }

  labels.push(totpLabel);

  return labels.join(' \u00B7 ');
}

/** Строка пользователя: имя, признаки, меню действий и диалоги */
export function UserRow({ user, isSelf }: UserRowProps): ReactNode {
  const {
    dialog,
    password,
    isBusy,
    isPasswordValid,
    onCreatorToggleSelect,
    onPasswordSelect,
    onTotpSelect,
    onEnableSelect,
    onDisableSelect,
    onDeleteSelect,
    onDialogOpenChange,
    onPasswordChange,
    onPasswordSubmit,
    onCancelClick,
    onTotpResetConfirm,
    onDisableConfirm,
    onDeleteConfirm,
  } = useUserRow(user);

  const avatarClassName = cn('size-10', { 'opacity-50': user.disabled });
  const infoClassName = cn('min-w-0 flex-1', { 'text-dim': user.disabled });
  const statusLine = getUserStatusLine(user);
  const totpTitle = `Сбросить 2FA для ${user.name}?`;
  const disableTitle = `Отключить ${user.name}?`;
  const deleteTitle = `Удалить ${user.name}?`;
  const isPasswordOpen = dialog === UserDialog.Password;
  const isTotpOpen = dialog === UserDialog.Totp;
  const isDisableOpen = dialog === UserDialog.Disable;
  const isDeleteOpen = dialog === UserDialog.Delete;

  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <Avatar user={user} className={avatarClassName} />
      <div className={infoClassName}>
        <p className="truncate">
          {user.name} <span className="text-dim">@{user.username}</span>
        </p>
        <p className="text-xs text-dim">{statusLine}</p>
      </div>
      <UserActionsMenu
        user={user}
        isSelf={isSelf}
        isBusy={isBusy}
        onCreatorToggleSelect={onCreatorToggleSelect}
        onPasswordSelect={onPasswordSelect}
        onTotpSelect={onTotpSelect}
        onEnableSelect={onEnableSelect}
        onDisableSelect={onDisableSelect}
        onDeleteSelect={onDeleteSelect}
      />

      <PasswordDialog
        user={user}
        isOpen={isPasswordOpen}
        password={password}
        isBusy={isBusy}
        isPasswordValid={isPasswordValid}
        onDialogOpenChange={onDialogOpenChange}
        onPasswordChange={onPasswordChange}
        onPasswordSubmit={onPasswordSubmit}
        onCancelClick={onCancelClick}
      />

      <ConfirmDialog
        open={isTotpOpen}
        onOpenChange={onDialogOpenChange}
        title={totpTitle}
        description="Сессии пользователя закроются. При следующем входе он подключит 2FA заново."
        confirmLabel="Сбросить 2FA"
        isBusy={isBusy}
        onConfirm={onTotpResetConfirm}
      />
      <ConfirmDialog
        open={isDisableOpen}
        onOpenChange={onDialogOpenChange}
        title={disableTitle}
        description="Вход станет невозможен, открытые сессии закроются. Заметки, задачи, публикации, роли в проектах и назначения останутся. Если он владелец проекта, переименовать проект, менять участников и удалить его будет некому, пока учётную запись не включат. Включить можно в любой момент."
        confirmLabel="Отключить"
        isBusy={isBusy}
        onConfirm={onDisableConfirm}
      />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={onDialogOpenChange}
        title={deleteTitle}
        description="Учётная запись удалится, вход станет невозможен; из ролей в проектах и исполнителей человек уберётся. Владельца проекта и автора заметок, задач или публикаций удалить нельзя - такого можно отключить."
        confirmLabel="Удалить"
        isBusy={isBusy}
        onConfirm={onDeleteConfirm}
      />
    </li>
  );
}
