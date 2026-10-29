import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { LoginResult, login } from '@/features/auth';
import { useMe } from '@/shared/hooks';
import { takeReturn } from '@/shared/utils';
import { useNavigate } from '@tanstack/react-router';
import { NON_DIGIT_RE } from '../constants/login';
import type { UseLoginPageResult } from '../types/login';
import { LoginStep } from '../types/login';

/** Вход по шагам: логин и пароль, затем код 2FA */
export function useLoginPage(): UseLoginPageResult {
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
