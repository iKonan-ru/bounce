import { MoreVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenuItem,
  DropdownMenu,
  DropdownMenuTrigger,
  Button,
  DropdownMenuContent,
} from '@/shared/ui';
import type { UserActionsMenuProps } from '../types/admin-users';

/** Меню действий с учётной записью */
export function UserActionsMenu({
  user,
  isSelf,
  isBusy,
  onCreatorToggleSelect,
  onPasswordSelect,
  onTotpSelect,
  onEnableSelect,
  onDisableSelect,
  onDeleteSelect,
}: UserActionsMenuProps): ReactNode {
  const actionsLabel = `Действия: ${user.name}`;
  const creatorLabel = user.can_create_projects
    ? 'Запретить создавать проекты'
    : 'Разрешить создавать проекты';
  const enableItem = (
    <DropdownMenuItem onSelect={onEnableSelect}>Включить</DropdownMenuItem>
  );
  const disableItem = (
    <DropdownMenuItem onSelect={onDisableSelect}>Отключить</DropdownMenuItem>
  );
  const switchItem = user.disabled ? enableItem : disableItem;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={actionsLabel}
          disabled={isBusy}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!user.is_admin && (
          <DropdownMenuItem onSelect={onCreatorToggleSelect}>
            {creatorLabel}
          </DropdownMenuItem>
        )}
        {/* свой пароль меняют в профиле - со старым паролем */}
        {!isSelf && (
          <DropdownMenuItem onSelect={onPasswordSelect}>
            Задать пароль
          </DropdownMenuItem>
        )}
        {user.totp_enabled && (
          <DropdownMenuItem onSelect={onTotpSelect}>
            Сбросить 2FA
          </DropdownMenuItem>
        )}
        {!isSelf && switchItem}
        {!isSelf && (
          <DropdownMenuItem variant="destructive" onSelect={onDeleteSelect}>
            Удалить
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
