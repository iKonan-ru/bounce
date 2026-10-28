import { ClientResponseError } from 'pocketbase';
import { useSyncExternalStore } from 'react';
import { pb } from './pb';

export type Me = {
  id: string;
  collectionId: string;
  collectionName: string;
  avatar: string;
  username: string;
  name: string;
  isAdmin: boolean;
  // без подключённой 2FA правила PocketBase не отдают данных: сначала экран подключения
  totpEnabled: boolean;
};

let cachedKey = '';
let cachedMe: Me | null = null;

// снимок для useSyncExternalStore: тот же объект, пока не сменились токен или запись
function snapshot(): Me | null {
  const r = pb.authStore.record;
  if (!pb.authStore.isValid || !r) return null;
  const key = `${pb.authStore.token}|${r['updated']}|${r['totp_enabled']}|${r['name']}|${r['avatar']}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cachedMe = {
      id: r.id,
      collectionId: r.collectionId,
      collectionName: r.collectionName,
      avatar: typeof r['avatar'] === 'string' ? r['avatar'] : '',
      username: typeof r['username'] === 'string' ? r['username'] : '',
      name: typeof r['name'] === 'string' ? r['name'] : '',
      isAdmin: r['is_admin'] === true,
      totpEnabled: r['totp_enabled'] === true,
    };
  }
  return cachedMe;
}

function subscribe(onChange: () => void): () => void {
  return pb.authStore.onChange(onChange);
}

export function useMe(): Me | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export type LoginResult = 'ok' | 'totp_required' | 'totp_invalid' | 'bad_credentials';

// код ошибки 2FA из ответа хука (data.code.code)
function totpError(e: unknown): 'totp_required' | 'totp_invalid' | undefined {
  if (!(e instanceof ClientResponseError)) return undefined;
  const field: unknown = e.response['data']?.['code'];
  if (typeof field !== 'object' || field === null || !('code' in field)) return undefined;
  const code = field.code;
  return code === 'totp_required' || code === 'totp_invalid' ? code : undefined;
}

export async function login(
  username: string,
  password: string,
  code?: string,
): Promise<LoginResult> {
  try {
    const identity = username.trim().toLowerCase();
    // SDK заменяет тело запроса целиком: логин и пароль передаются в нём же, рядом с кодом
    await pb
      .collection('users')
      .authWithPassword(identity, password, code ? { body: { identity, password, code } } : {});
    return 'ok';
  } catch (e) {
    const totp = totpError(e);
    if (totp) return totp;
    if (e instanceof ClientResponseError && e.status === 400) return 'bad_credentials';
    throw e;
  }
}

export function logout(): void {
  pb.authStore.clear();
}

// При запуске: продлить токен и перечитать запись. Отозванный или истёкший токен - на вход;
// без сети (status 0) сессия остаётся: приложение показывает сохранённые данные.
export async function refreshAuth(): Promise<void> {
  if (!pb.authStore.isValid) return;
  try {
    await pb.collection('users').authRefresh();
  } catch (e) {
    if (e instanceof ClientResponseError && e.status > 0) pb.authStore.clear();
  }
}

export type TotpSetup = { secret: string; uri: string };

export async function startTotpSetup(): Promise<TotpSetup> {
  const res: unknown = await pb.send('/api/bounce/totp/setup', { method: 'POST' });
  if (
    typeof res === 'object' &&
    res !== null &&
    'secret' in res &&
    'uri' in res &&
    typeof res.secret === 'string' &&
    typeof res.uri === 'string'
  ) {
    return { secret: res.secret, uri: res.uri };
  }
  throw new Error('неожиданный ответ сервера');
}

// true - 2FA включена, false - неверный код
export async function enableTotp(code: string): Promise<boolean> {
  try {
    await pb.send('/api/bounce/totp/enable', { method: 'POST', body: { code } });
  } catch (e) {
    if (totpError(e) === 'totp_invalid') return false;
    throw e;
  }
  await pb.collection('users').authRefresh();
  return true;
}

export async function resetUserTotp(userId: string): Promise<void> {
  await pb.send(`/api/bounce/users/${encodeURIComponent(userId)}/totp-reset`, { method: 'POST' });
}
