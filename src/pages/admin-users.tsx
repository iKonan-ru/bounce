import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { MoreVertical, Plus } from 'lucide-react';
import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Loading } from '@/components/loading';
import { type Crumb, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetUserTotp, useMe } from '@/lib/auth';
import { SAVE_FAILED } from '@/lib/errors';
import type { User } from '@/lib/model';
import { Collections, getCollection, pb } from '@/lib/pb';
import { usersQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/** Логин: латиница в нижнем регистре, цифры, точка, дефис, подчёркивание; 3-32 знака */
const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

/** Пробельные знаки: в логине их не бывает */
const WHITESPACE_RE = /\s/g;

/** Предел длины логина */
const USERNAME_MAX_LENGTH = 32;

/** Предел длины отображаемого имени */
const NAME_MAX_LENGTH = 60;

/** Наименьшая длина пароля */
const PASSWORD_MIN_LENGTH = 8;

/** Крошки страницы: назад в профиль */
const ADMIN_CRUMBS: Crumb[] = [{ label: 'Профиль', link: { to: '/me' } }];

/** Открытый диалог строки пользователя */
enum UserDialog {
  None = 'none',
  /** Новый пароль */
  Password = 'password',
  /** Сброс 2FA */
  Totp = 'totp',
  /** Отключение учётной записи */
  Disable = 'disable',
  Delete = 'delete',
}

/** Пропсы строки пользователя */
interface UserRowProps {
  user: User;
  /** Это сам главный пользователь */
  isSelf: boolean;
}

/** Результат хука строки пользователя */
interface UseUserRowResult {
  dialog: UserDialog;
  password: string;
  isBusy: boolean;
  isPasswordValid: boolean;
  onCreatorToggleSelect: () => void;
  onPasswordSelect: () => void;
  onTotpSelect: () => void;
  onEnableSelect: () => void;
  onDisableSelect: () => void;
  onDeleteSelect: () => void;
  onDialogOpenChange: (isOpen: boolean) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelClick: () => void;
  onTotpResetConfirm: () => void;
  onDisableConfirm: () => void;
  onDeleteConfirm: () => void;
}

/** Пропсы меню действий с пользователем */
interface UserActionsMenuProps
  extends Pick<
    UseUserRowResult,
    | 'isBusy'
    | 'onCreatorToggleSelect'
    | 'onPasswordSelect'
    | 'onTotpSelect'
    | 'onEnableSelect'
    | 'onDisableSelect'
    | 'onDeleteSelect'
  > {
  user: User;
  isSelf: boolean;
}

/** Пропсы диалога нового пароля */
interface PasswordDialogProps
  extends Pick<
    UseUserRowResult,
    | 'password'
    | 'isBusy'
    | 'isPasswordValid'
    | 'onDialogOpenChange'
    | 'onPasswordChange'
    | 'onPasswordSubmit'
    | 'onCancelClick'
  > {
  user: User;
  isOpen: boolean;
}

/** Пропсы диалога нового пользователя */
interface NewUserDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Результат хука диалога нового пользователя */
interface UseNewUserDialogResult {
  username: string;
  name: string;
  password: string;
  isAdmin: boolean;
  canCreate: boolean;
  isSubmitDisabled: boolean;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAdminCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onCanCreateCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onCancelClick: () => void;
}

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

/** Учётные записи заводит и обслуживает главный пользователь */
export function AdminUsersPage(): ReactNode {
  const me = useMe();
  const users = useQuery(usersQuery);
  const [isCreating, setIsCreating] = useState(false);
  const isNotAdmin = me !== null && !me.isAdmin;
  const hasLoadError = users.isError && !users.data;

  const onNewUserClick = (): void => {
    setIsCreating(true);
  };

  if (isNotAdmin) {
    return <Navigate to="/me" />;
  }

  const newUserButton = (
    <Button onClick={onNewUserClick}>
      <Plus data-icon="inline-start" />
      Новый пользователь
    </Button>
  );

  return (
    <section className="max-w-2xl">
      <PageHeader crumbs={ADMIN_CRUMBS} title="Пользователи" actions={newUserButton} />
      {users.isPending && <Loading className="h-40 rounded-xl" />}
      {hasLoadError && <p className="text-led-red">Список пользователей не загрузился.</p>}
      <ul className="flex flex-col">
        {users.data?.map((user) => {
          const isSelf = user.id === me?.id;
          return <UserRow key={user.id} user={user} isSelf={isSelf} />;
        })}
      </ul>
      <NewUserDialog open={isCreating} onOpenChange={setIsCreating} />
    </section>
  );
}

/** Действия с учётной записью: пароль, 2FA, отключение, удаление, право создавать проекты */
function useUserRow(user: User): UseUserRowResult {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<UserDialog>(UserDialog.None);
  const [password, setPassword] = useState('');
  const isPasswordValid = password.length >= PASSWORD_MIN_LENGTH;

  const handleDialogClose = (): void => {
    setDialog(UserDialog.None);
    setPassword('');
  };

  const refreshUsers = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  const setNewPassword = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Users).update(user.id, {
        password,
        passwordConfirm: password,
      }),
    onSuccess: () => {
      toast.success(`Пароль ${user.name} изменён`);
      handleDialogClose();
    },
    onError: () => toast.error('Пароль не изменён'),
  });
  const resetTotp = useMutation({
    mutationFn: () => resetUserTotp(user.id),
    onSuccess: async () => {
      toast.success(`2FA ${user.name} сброшена`);
      handleDialogClose();
      await refreshUsers();
    },
    onError: () => toast.error('2FA не сброшена'),
  });
  const removeUser = useMutation({
    mutationFn: () => getCollection(pb, Collections.Users).delete(user.id),
    onSuccess: async () => {
      handleDialogClose();
      await refreshUsers();
    },
    onError: () =>
      toast.error(
        'Пользователь не удалён: возможно, он владелец проекта или автор записей. Его можно отключить',
      ),
  });
  // отключённый не входит, его сессии закрыты; записи и роли остаются (pb_hooks/users.pb.js)
  const switchOff = useMutation({
    mutationFn: (disabled: boolean) =>
      getCollection(pb, Collections.Users).update(user.id, { disabled }),
    onSuccess: async (_updated, disabled) => {
      if (disabled) {
        toast.success(`${user.name} отключён`);
      } else {
        toast.success(`${user.name} снова может войти`);
      }
      handleDialogClose();
      await refreshUsers();
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const setCanCreateProjects = useMutation({
    mutationFn: (canCreate: boolean) =>
      getCollection(pb, Collections.Users).update(user.id, { can_create_projects: canCreate }),
    onSuccess: refreshUsers,
    onError: () => toast.error(SAVE_FAILED),
  });
  const isBusy = [
    setNewPassword.isPending,
    resetTotp.isPending,
    removeUser.isPending,
    setCanCreateProjects.isPending,
    switchOff.isPending,
  ].some(Boolean);

  const onCreatorToggleSelect = (): void => {
    setCanCreateProjects.mutate(!user.can_create_projects);
  };

  const onPasswordSelect = (): void => {
    setDialog(UserDialog.Password);
  };

  const onTotpSelect = (): void => {
    setDialog(UserDialog.Totp);
  };

  const onEnableSelect = (): void => {
    switchOff.mutate(false);
  };

  const onDisableSelect = (): void => {
    setDialog(UserDialog.Disable);
  };

  const onDeleteSelect = (): void => {
    setDialog(UserDialog.Delete);
  };

  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      handleDialogClose();
    }
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const onPasswordSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isPasswordValid) {
      setNewPassword.mutate();
    }
  };

  const onCancelClick = (): void => {
    handleDialogClose();
  };

  const onTotpResetConfirm = (): void => {
    resetTotp.mutate();
  };

  const onDisableConfirm = (): void => {
    switchOff.mutate(true);
  };

  const onDeleteConfirm = (): void => {
    removeUser.mutate();
  };

  return {
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
  };
}

/** Строка пользователя: имя, признаки, меню действий и диалоги */
function UserRow({ user, isSelf }: UserRowProps): ReactNode {
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

/** Меню действий с учётной записью */
function UserActionsMenu({
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
  const enableItem = <DropdownMenuItem onSelect={onEnableSelect}>Включить</DropdownMenuItem>;
  const disableItem = <DropdownMenuItem onSelect={onDisableSelect}>Отключить</DropdownMenuItem>;
  const switchItem = user.disabled ? enableItem : disableItem;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={actionsLabel} disabled={isBusy}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!user.is_admin && (
          <DropdownMenuItem onSelect={onCreatorToggleSelect}>{creatorLabel}</DropdownMenuItem>
        )}
        {/* свой пароль меняют в профиле - со старым паролем */}
        {!isSelf && <DropdownMenuItem onSelect={onPasswordSelect}>Задать пароль</DropdownMenuItem>}
        {user.totp_enabled && (
          <DropdownMenuItem onSelect={onTotpSelect}>Сбросить 2FA</DropdownMenuItem>
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

/** Диалог нового пароля для пользователя */
function PasswordDialog({
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
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onCancelClick}>
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

/** Поля и создание новой учётной записи */
function useNewUserDialog(onOpenChange: (isOpen: boolean) => void): UseNewUserDialogResult {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const canCreateProjects = isAdmin || canCreate;

  const createUser = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.Users).create({
        username,
        name: name.trim(),
        password,
        passwordConfirm: password,
        is_admin: isAdmin,
        can_create_projects: canCreateProjects,
      }),
    onSuccess: async () => {
      toast.success(`Учётная запись ${username} создана: 2FA подключается при первом входе`);
      onOpenChange(false);
      setUsername('');
      setName('');
      setPassword('');
      setIsAdmin(false);
      setCanCreate(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => toast.error('Не добавлен: возможно, такой логин уже есть'),
  });

  const isValid = [
    USERNAME_RE.test(username),
    name.trim() !== '',
    password.length >= PASSWORD_MIN_LENGTH,
  ].every(Boolean);
  const isSubmitDisabled = !isValid || createUser.isPending;

  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isValid) {
      createUser.mutate();
    }
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setUsername(event.target.value.toLowerCase().replace(WHITESPACE_RE, ''));
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const onAdminCheckedChange = (checked: CheckboxPrimitive.CheckedState): void => {
    setIsAdmin(checked === true);
  };

  const onCanCreateCheckedChange = (checked: CheckboxPrimitive.CheckedState): void => {
    setCanCreate(checked === true);
  };

  const onCancelClick = (): void => {
    onOpenChange(false);
  };

  return {
    username,
    name,
    password,
    isAdmin,
    canCreate,
    isSubmitDisabled,
    onFormSubmit,
    onUsernameChange,
    onNameChange,
    onPasswordChange,
    onAdminCheckedChange,
    onCanCreateCheckedChange,
    onCancelClick,
  };
}

/** Диалог новой учётной записи: 2FA человек подключит при первом входе */
function NewUserDialog({ open, onOpenChange }: NewUserDialogProps): ReactNode {
  const {
    username,
    name,
    password,
    isAdmin,
    canCreate,
    isSubmitDisabled,
    onFormSubmit,
    onUsernameChange,
    onNameChange,
    onPasswordChange,
    onAdminCheckedChange,
    onCanCreateCheckedChange,
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
            <Label htmlFor="new-username">Логин: латиница, цифры, точка, дефис</Label>
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
          <label htmlFor="new-admin" className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="new-admin"
              className="size-5"
              checked={isAdmin}
              onCheckedChange={onAdminCheckedChange}
            />
            <span>Главный пользователь</span>
          </label>
          {!isAdmin && (
            <label htmlFor="new-creates" className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="new-creates"
                className="size-5"
                checked={canCreate}
                onCheckedChange={onCanCreateCheckedChange}
              />
              <span>Может создавать проекты</span>
            </label>
          )}
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
