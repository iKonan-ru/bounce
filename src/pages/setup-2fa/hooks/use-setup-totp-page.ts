import QRCode from 'qrcode';
import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { startTotpSetup, enableTotp } from '@/features/auth';
import { queryKeys } from '@/shared/api';
import { useMe } from '@/shared/hooks';
import { takeReturn } from '@/shared/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  QR_MARGIN,
  QR_WIDTH,
  SECRET_GROUP_RE,
  SECRET_GROUP_REPLACEMENT,
  NON_DIGIT_RE,
  TOTP_CODE_LENGTH,
} from '../constants/setup-2fa';
import type {
  TotpSetupWithQr,
  UseSetupTotpPageResult,
} from '../types/setup-2fa';

/** Получить новый ключ 2FA и нарисовать его QR-код */
async function fetchTotpSetup(): Promise<TotpSetupWithQr> {
  const setup = await startTotpSetup();
  const qr = await QRCode.toDataURL(setup.uri, {
    margin: QR_MARGIN,
    width: QR_WIDTH,
  });

  return { ...setup, qr };
}

/** Ключ группами по 4 знака - удобнее переписывать руками */
function getGroupedSecret(secret: string | undefined): string | undefined {
  if (secret === undefined) {
    return undefined;
  }

  return secret.replace(SECRET_GROUP_RE, SECRET_GROUP_REPLACEMENT).trim();
}

/** Новый ключ 2FA и его подтверждение кодом из приложения */
export function useSetupTotpPage(): UseSetupTotpPageResult {
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
      setError(
        'Код не подошёл. Проверьте, что время на телефоне выставлено автоматически.'
      );
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
