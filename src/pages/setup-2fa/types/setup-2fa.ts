import type { ChangeEvent, FormEvent } from 'react';
import type { TotpSetup } from '@/features/auth';

/** Ключ 2FA вместе с картинкой QR-кода */
export interface TotpSetupWithQr extends TotpSetup {
  /** QR-код ссылки ключа: data URL картинки */
  qr: string;
}

/** Пропсы плашки с ключом */
export interface SetupKeyProps {
  /** QR-код ключа; пока не получен - заглушка */
  qr: string | undefined;
  isError: boolean;
  /** Ключ группами для ввода вручную */
  secret: string | undefined;
}

/** Состояние и действия экрана подключения 2FA */
export interface UseSetupTotpPageResult {
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
