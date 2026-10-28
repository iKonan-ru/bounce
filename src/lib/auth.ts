import { useSyncExternalStore } from 'react';
import { pb } from './pb';

export type Me = { id: string; name: string; email: string };

let cachedToken = '';
let cachedMe: Me | null = null;

// снимок для useSyncExternalStore: тот же объект, пока не сменился токен
function snapshot(): Me | null {
  const record = pb.authStore.record;
  if (!pb.authStore.isValid || !record) return null;
  if (pb.authStore.token !== cachedToken || cachedMe?.id !== record.id) {
    cachedToken = pb.authStore.token;
    cachedMe = {
      id: record.id,
      name: typeof record.name === 'string' ? record.name : '',
      email: typeof record.email === 'string' ? record.email : '',
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

export function currentUserId(): string {
  const id = pb.authStore.record?.id;
  if (!id) throw new Error('нет входа');
  return id;
}

export async function login(email: string, password: string): Promise<void> {
  await pb.collection('users').authWithPassword(email.trim(), password);
}

export function logout(): void {
  pb.authStore.clear();
}

// при запуске: продлить токен; отозванный или истёкший - на вход
export async function refreshAuth(): Promise<void> {
  if (!pb.authStore.isValid) return;
  try {
    await pb.collection('users').authRefresh();
  } catch {
    pb.authStore.clear();
  }
}
