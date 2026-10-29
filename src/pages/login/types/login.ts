import type { ChangeEvent, FormEvent } from 'react';

/** Шаг входа */
export enum LoginStep {
  /** Логин и пароль */
  Password = 'password',
  /** Код 2FA */
  Code = 'code',
}

/** Пропсы полей логина и пароля */
export interface PasswordFieldsProps {
  username: string;
  password: string;
  onUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Пропсы поля кода 2FA */
export interface CodeFieldProps {
  code: string;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Состояние и действия экрана входа */
export interface UseLoginPageResult {
  /** Уже вошёл: экран входа не нужен */
  isLoggedIn: boolean;
  username: string;
  password: string;
  code: string;
  isCodeStep: boolean;
  error: string;
  isBusy: boolean;
  onUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => Promise<void>;
  onOtherLoginClick: () => void;
}
