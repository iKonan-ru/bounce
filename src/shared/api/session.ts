import type { Me } from '../types/session';
import { pb } from './pb';

/** Подпись снимка пользователя: по ней видно, что токен или запись сменились */
let cachedKey = '';

/** Снимок текущего пользователя */
let cachedMe: Me | null = null;

/** Строка из поля записи; не строка - пусто */
function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Снимок для useSyncExternalStore: тот же объект, пока не сменились токен или запись */
export function getMeSnapshot(): Me | null {
  const record = pb.authStore.record;

  if (!pb.authStore.isValid || !record) {
    return null;
  }

  const key = [
    pb.authStore.token,
    record.updated,
    record.totp_enabled,
    record.name,
    record.avatar,
    record.can_create_projects,
  ].join('|');

  if (key === cachedKey) {
    return cachedMe;
  }

  const isAdmin = record.is_admin === true;
  cachedKey = key;
  cachedMe = {
    id: record.id,
    collectionId: record.collectionId,
    collectionName: record.collectionName,
    avatar: getStringValue(record.avatar),
    username: getStringValue(record.username),
    name: getStringValue(record.name),
    isAdmin,
    canCreateProjects: isAdmin || record.can_create_projects === true,
    isTotpEnabled: record.totp_enabled === true,
  };

  return cachedMe;
}

/** Подписка на смену сессии */
export function subscribe(onChange: () => void): () => void {
  return pb.authStore.onChange(onChange);
}
