import { useMutation, useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enableTotp, logout, startTotpSetup, type TotpSetup, useMe } from '@/lib/auth';
import { queryKeys } from '@/lib/query-keys';
import { takeReturn } from '@/lib/return-to';

/** Ключ 2FA вместе с картинкой QR-кода */
interface TotpSetupWithQr extends TotpSetup {
  /** QR-код ссылки ключа: data URL картинки */
  qr: string;
}

/** Поле вокруг QR-кода, в модулях */
const QR_MARGIN = 1;

/** Ширина картинки QR-кода, px */
const QR_WIDTH = 240;

/** Группы по 4 знака ключа: так его удобнее переписывать руками */
const SECRET_GROUP_RE = /(.{4})/g;

/** Замена группы ключа: она же и пробел после неё */
const SECRET_GROUP_REPLACEMENT = '$1 ';

/** Всё, что не цифра: в поле кода остаются только цифры */
const NON_DIGIT_RE = /\D/g;

/** Сколько цифр в коде 2FA */
const TOTP_CODE_LENGTH = 6;

/** Получить новый ключ 2FA и нарисовать его QR-код */
async function fetchTotpSetup(): Promise<TotpSetupWithQr> {
  const setup = await startTotpSetup();
  const qr = await QRCode.toDataURL(setup.uri, { margin: QR_MARGIN, width: QR_WIDTH });
  return { ...setup, qr };
}

/** Ключ группами по 4 знака - удобнее переписывать руками */
function getGroupedSecret(secret: string | undefined): string | undefined {
  if (secret === undefined) {
    return undefined;
  }
  return secret.replace(SECRET_GROUP_RE, SECRET_GROUP_REPLACEMENT).trim();
}

/** Пропсы плашки с ключом */
interface SetupKeyProps {
  /** QR-код ключа; пока не получен - заглушка */
  qr: string | undefined;
  isError: boolean;
  /** Ключ группами для ввода вручную */
  secret: string | undefined;
}

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
      {isError && <p className="text-sm text-led-red">Ключ не получен. Обновите страницу.</p>}
      {secret && (
        <p className="text-center text-xs text-dim">
          Или введите ключ вручную:
          <br />
          <span className="font-mono text-sm text-ink select-all">{secret}</span>
        </p>
      )}
    </div>
  );
}

/** Состояние и действия экрана подключения 2FA */
interface UseSetupTotpPageResult {
  /** Нет входа: сначала экран входа */
  isLoggedOut: boolean;
  /** 2FA уже подключена: экран не нужен */
  isTotpEnabled: boolean;
  qr: string | undefined;
  isSetupError: boolean;
  secret: string | undefined;
  code: string;
  error: string;
  isEnabling: boolean;
  isSubmitDisabled: boolean;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (event: FormEvent) => void;
}

/** Новый ключ 2FA и его подтверждение кодом из приложения */
function useSetupTotpPage(): UseSetupTotpPageResult {
  const me = useMe();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const shouldStartSetup = me !== null && !me.isTotpEnabled;

  // новый ключ при каждом открытии экрана; прежний неподтверждённый пропадает
  const setup = useQuery({
    queryKey: queryKeys.totpSetup(me?.id),
    queryFn: fetchTotpSetup,
    enabled: shouldStartSetup,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });

  const enable = useMutation({
    mutationFn: (): Promise<boolean> => enableTotp(code),
    onSuccess: async (isEnabled) => {
      if (isEnabled) {
        await navigate({ href: takeReturn(), replace: true });
        return;
      }
      setCode('');
      setError('Код не подошёл. Проверьте, что время на телефоне выставлено автоматически.');
    },
    onError: () => {
      setError('Сервер не отвечает. Проверьте соединение.');
    },
  });

  const onFormSubmit = (event: FormEvent): void => {
    event.preventDefault();
    setError('');
    enable.mutate();
  };

  const onCodeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value.replace(NON_DIGIT_RE, ''));
  };

  const isCodeIncomplete = code.length !== TOTP_CODE_LENGTH;
  const isSubmitDisabled = !setup.data || enable.isPending || isCodeIncomplete;

  return {
    isLoggedOut: me === null,
    isTotpEnabled: me?.isTotpEnabled === true,
    qr: setup.data?.qr,
    isSetupError: setup.isError,
    secret: getGroupedSecret(setup.data?.secret),
    code,
    error,
    isEnabling: enable.isPending,
    isSubmitDisabled,
    onCodeChange,
    onFormSubmit,
  };
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
        Отсканируйте код в приложении-аутентификаторе (Google Authenticator, 1Password, Яндекс Ключ)
        и введите шесть цифр, которые оно покажет. Без этого данные проектов недоступны.
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
        <Button type="button" variant="ghost" disabled={isEnabling} onClick={logout}>
          Выйти
        </Button>
      </form>
    </div>
  );
}
