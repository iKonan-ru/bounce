import type { ChangeEvent, ReactNode, FormEvent } from 'react';
import { useState } from 'react';
import { LoginResult, login } from '@/lib/auth';
import { useMe } from '@/shared/hooks';
import { Label, Input, Logo, Button } from '@/shared/ui';
import { takeReturn } from '@/shared/utils';
import { useNavigate, Navigate } from '@tanstack/react-router';

/** Шаг входа */
enum LoginStep {
  /** Логин и пароль */
  Password = 'password',
  /** Код 2FA */
  Code = 'code',
}

/** Всё, что не цифра: в поле кода остаются только цифры */
const NON_DIGIT_RE = /\D/g;

/** Пропсы полей логина и пароля */
interface PasswordFieldsProps {
  username: string;
  password: string;
  onUsernameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

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

/** Пропсы поля кода 2FA */
interface CodeFieldProps {
  code: string;
  onCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
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

/** Состояние и действия экрана входа */
interface UseLoginPageResult {
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

/** Вход по шагам: логин и пароль, затем код 2FA */
function useLoginPage(): UseLoginPageResult {
  const me = useMe();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LoginStep>(LoginStep.Password);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const isCodeStep = step === LoginStep.Code;

  const handleLoginResult = async (result: LoginResult): Promise<void> => {
    if (result === LoginResult.Ok) {
      await navigate({ href: takeReturn(), replace: true });

      return;
    }

    if (result === LoginResult.TotpRequired) {
      setStep(LoginStep.Code);

      return;
    }

    if (result === LoginResult.TotpInvalid) {
      setCode('');
      setError('Код не подошёл. Введите текущий код из приложения.');

      return;
    }

    if (result === LoginResult.UserDisabled) {
      setStep(LoginStep.Password);
      setCode('');
      setError(
        'Учётная запись отключена. Чтобы снова входить, обратитесь к главному.'
      );

      return;
    }

    setStep(LoginStep.Password);
    setError('Неверный логин или пароль');
  };

  const onFormSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    const sentCode = isCodeStep ? code : undefined;
    try {
      const result = await login(username, password, sentCode);
      await handleLoginResult(result);
    } catch {
      setError('Сервер не отвечает. Проверьте соединение.');
    } finally {
      setIsBusy(false);
    }
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setUsername(event.target.value);
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const onCodeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCode(event.target.value.replace(NON_DIGIT_RE, ''));
  };

  const onOtherLoginClick = (): void => {
    setStep(LoginStep.Password);
    setCode('');
    setError('');
  };

  return {
    isLoggedIn: me !== null,
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
  };
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
