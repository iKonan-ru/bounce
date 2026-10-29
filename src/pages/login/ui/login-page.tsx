import type { ReactNode } from 'react';
import { Label, Input, Logo, Button } from '@/shared/ui';
import { Navigate } from '@tanstack/react-router';
import { useLoginPage } from '../hooks/use-login-page';
import type { PasswordFieldsProps, CodeFieldProps } from '../types/login';

/** Поля логина и пароля */
function PasswordFields({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
}: PasswordFieldsProps): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Логин</Label>
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={onUsernameChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={onPasswordChange}
        />
      </div>
    </>
  );
}

/** Поле кода из приложения-аутентификатора */
function CodeField({ code, onCodeChange }: CodeFieldProps): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="code">Код из приложения-аутентификатора</Label>
      <Input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        value={code}
        onChange={onCodeChange}
        className="text-center text-2xl tracking-[0.4em]"
      />
    </div>
  );
}

/** Вход: логин и пароль, затем код из приложения-аутентификатора (если 2FA уже подключена) */
export function LoginPage(): ReactNode {
  const {
    isLoggedIn,
    username,
    password,
    code,
    isCodeStep,
    error,
    isBusy,
    onUsernameChange,
    onPasswordChange,
    onCodeChange,
    onFormSubmit,
    onOtherLoginClick,
  } = useLoginPage();

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const passwordFields = (
    <PasswordFields
      username={username}
      password={password}
      onUsernameChange={onUsernameChange}
      onPasswordChange={onPasswordChange}
    />
  );
  const codeField = <CodeField code={code} onCodeChange={onCodeChange} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-10 flex items-center gap-3">
        <Logo />
        <span className="text-2xl font-semibold tracking-tight">Bounce</span>
      </div>
      <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
        {isCodeStep ? codeField : passwordFields}
        {error && <p className="text-sm text-led-red">{error}</p>}
        <Button type="submit" size="lg" disabled={isBusy} className="mt-2">
          {isCodeStep ? 'Подтвердить' : 'Войти'}
        </Button>
        {isCodeStep && (
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy}
            onClick={onOtherLoginClick}
          >
            Другой логин
          </Button>
        )}
      </form>
    </div>
  );
}
