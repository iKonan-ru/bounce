import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { Logo, Label, Input, Button } from '@/shared/ui';
import { Navigate } from '@tanstack/react-router';
import { useSetupTotpPage } from '../hooks/use-setup-totp-page';
import type { SetupKeyProps } from '../types/setup-2fa';

/** QR-код ключа и сам ключ для ввода вручную */
function SetupKey({ qr, isError, secret }: SetupKeyProps): ReactNode {
  const qrImage = qr ? (
    <img
      src={qr}
      alt="QR-код для приложения-аутентификатора"
      width={200}
      height={200}
      className="rounded-md bg-white p-2"
    />
  ) : (
    <div className="size-[200px] animate-pulse rounded-md bg-groove" />
  );

  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-panel p-4">
      {qrImage}
      {isError && (
        <p className="text-sm text-led-red">
          Ключ не получен. Обновите страницу.
        </p>
      )}
      {secret && (
        <p className="text-center text-xs text-dim">
          Или введите ключ вручную:
          <br />
          <span className="font-mono text-sm text-ink select-all">
            {secret}
          </span>
        </p>
      )}
    </div>
  );
}

/** Подключение 2FA: обязательно при первом входе и после сброса главным пользователем */
export function SetupTotpPage(): ReactNode {
  const {
    isLoggedOut,
    isTotpEnabled,
    qr,
    isSetupError,
    secret,
    code,
    error,
    isEnabling,
    isSubmitDisabled,
    onCodeChange,
    onFormSubmit,
  } = useSetupTotpPage();

  if (isLoggedOut) {
    return <Navigate to="/login" />;
  }

  if (isTotpEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Logo />
        <span className="text-2xl font-semibold tracking-tight">Bounce</span>
      </div>
      <h1 className="text-xl font-semibold">Подключите 2FA</h1>
      <p className="mt-2 text-sm text-dim">
        Отсканируйте код в приложении-аутентификаторе (Google Authenticator,
        1Password, Яндекс Ключ) и введите шесть цифр, которые оно покажет. Без
        этого данные проектов недоступны.
      </p>

      <SetupKey qr={qr} isError={isSetupError} secret={secret} />

      <form onSubmit={onFormSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Код из приложения</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={onCodeChange}
            className="text-center text-2xl tracking-[0.4em]"
          />
        </div>
        {error && <p className="text-sm text-led-red">{error}</p>}
        <Button type="submit" size="lg" disabled={isSubmitDisabled}>
          Подключить
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isEnabling}
          onClick={logout}
        >
          Выйти
        </Button>
      </form>
    </div>
  );
}
