import type { ChangeEvent, FormEvent } from 'react';
import type { User } from '@/entities/user';

/** Роль учетной записи в приложении */
export enum UserRole {
  /** Управляет учетными записями */
  Admin = 'admin',
  /** Может создавать проекты */
  Creator = 'creator',
  /** Работает в доступных проектах */
  User = 'user',
}

/** Открытый диалог строки пользователя */
export enum UserDialog {
  /** Окна закрыты */
  None = 'none',
  /** Новый пароль */
  Password = 'password',
  /** Сброс 2FA */
  Totp = 'totp',
  /** Отключение учётной записи */
  Disable = 'disable',
  /** Удаление учётной записи */
  Delete = 'delete',
}

/** Пропсы строки пользователя */
export interface UserRowProps {
  user: User;
  /** Это сам главный пользователь */
  isSelf: boolean;
}

/** Результат хука строки пользователя */
export interface UseUserRowResult {
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
export interface UserActionsMenuProps extends Pick<
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
export interface PasswordDialogProps extends Pick<
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
export interface NewUserDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Результат хука диалога нового пользователя */
export interface UseNewUserDialogResult {
  username: string;
  name: string;
  password: string;
  role: UserRole;
  isSubmitDisabled: boolean;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (role: UserRole) => void;
  onCancelClick: () => void;
}
