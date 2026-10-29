import { ClientResponseError } from 'pocketbase';
import { getFieldCode, pb, Collections } from '@/shared/api';
import { BAD_REQUEST_STATUS } from '@/shared/constants';
import {
  forgetReturn,
  clearTextDrafts,
  checkHasStringField,
} from '@/shared/utils';
import { clearOutbox } from './outbox';

/** Чем кончилась попытка входа */
export enum LoginResult {
  /** Вход выполнен */
  Ok = 'ok',
  /** Нужен код 2FA */
  TotpRequired = 'totp_required',
  /** Неверный код 2FA */
  TotpInvalid = 'totp_invalid',
  /** Учётная запись отключена */
  UserDisabled = 'user_disabled',
  /** Неверный логин или пароль */
  BadCredentials = 'bad_credentials',
}

/** Код отказа входа */
type AuthErrorCode =
  LoginResult.TotpRequired | LoginResult.TotpInvalid | LoginResult.UserDisabled;

/** Отказ входа с причиной из хуков (data.code.code): 2FA (pb_hooks/totp.pb.js) или отключённая учётная запись (pb_hooks/users.pb.js) */
const AUTH_ERROR_CODES: readonly AuthErrorCode[] = [
  LoginResult.TotpRequired,
  LoginResult.TotpInvalid,
  LoginResult.UserDisabled,
];

/** Ответы, которыми сервер отказывает в сессии: токен отозван, истёк или учётной записи больше нет */
const SESSION_REJECTED_STATUSES: ReadonlySet<number> = new Set([401, 403]);

/** Код отказа из ответа хуков; другая ошибка - undefined */
function getAuthErrorCode(error: unknown): AuthErrorCode | undefined {
  if (!(error instanceof ClientResponseError)) {
    return undefined;
  }

  const code = getFieldCode(error, 'code');

  return AUTH_ERROR_CODES.find((authCode) => authCode === code);
}

/** Вход по логину, паролю и, если нужен, коду 2FA */
export async function login(
  username: string,
  password: string,
  code?: string
): Promise<LoginResult> {
  try {
    const identity = username.trim().toLowerCase();
    // SDK заменяет тело запроса целиком: логин и пароль передаются в нём же, рядом с кодом
    const options = code ? { body: { identity, password, code } } : {};
    await pb
      .collection(Collections.Users)
      .authWithPassword(identity, password, options);

    return LoginResult.Ok;
  } catch (error) {
    const refusal = getAuthErrorCode(error);

    if (refusal) {
      return refusal;
    }

    const isBadCredentials =
      error instanceof ClientResponseError &&
      error.status === BAD_REQUEST_STATUS;

    if (isBadCredentials) {
      return LoginResult.BadCredentials;
    }

    throw error;
  }
}

/** Явный выход (кнопка): кроме сессии стираются и неотправленные черновики заметок */
export function logout(): void {
  forgetReturn();
  clearTextDrafts();
  void clearOutbox();
  pb.authStore.clear();
}

/**
 * Сессия кончилась не по желанию человека (её закрыл сервер, сменился пароль)
 *
 * Черновики остаются и уйдут, когда он войдёт снова (lib/outbox.ts)
 */
export function dropSession(): void {
  pb.authStore.clear();
}

/** Сервер отказал в сессии: токен отозван, истёк или учётной записи больше нет */
function checkIsSessionRejected(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) {
    return false;
  }

  return SESSION_REJECTED_STATUSES.has(error.status);
}

/**
 * При запуске: продлить токен и перечитать запись. Отозванный или истёкший токен - на вход
 *
 * Без сети, при сбое сервера (5xx) или прокси (502 во время выкладки) сессия остаётся: выход
 * стёр бы данные, сохранённые на устройстве для работы без сети
 */
export async function refreshAuth(): Promise<void> {
  if (!pb.authStore.isValid) {
    return;
  }

  try {
    await pb.collection(Collections.Users).authRefresh();
  } catch (error) {
    if (checkIsSessionRejected(error)) {
      dropSession();
    }
  }
}

/** Ключ 2FA для приложения-аутентификатора */
export interface TotpSetup {
  secret: string;
  uri: string;
}

/** Получить новый ключ 2FA для подключения */
export async function startTotpSetup(): Promise<TotpSetup> {
  const response: unknown = await pb.send('/api/bounce/totp/setup', {
    method: 'POST',
  });
  const hasSecret = checkHasStringField(response, 'secret');

  if (hasSecret && checkHasStringField(response, 'uri')) {
    return { secret: response.secret, uri: response.uri };
  }

  throw new Error('неожиданный ответ сервера');
}

/** Подключить 2FA: true - включена, false - неверный код */
export async function enableTotp(code: string): Promise<boolean> {
  try {
    await pb.send('/api/bounce/totp/enable', {
      method: 'POST',
      body: { code },
    });
  } catch (error) {
    if (getAuthErrorCode(error) === LoginResult.TotpInvalid) {
      return false;
    }

    throw error;
  }
  await pb.collection(Collections.Users).authRefresh();

  return true;
}

/** Главный сбрасывает 2FA пользователю */
export async function resetUserTotp(userId: string): Promise<void> {
  await pb.send(`/api/bounce/users/${encodeURIComponent(userId)}/totp-reset`, {
    method: 'POST',
  });
}
