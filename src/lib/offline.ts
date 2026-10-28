import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { QueryClient } from '@tanstack/react-query';
import { createStore, del, get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';

// Данные приложения остаются на устройстве (IndexedDB): без сети открываются последние
// загруженные проекты, песни и заметки. Картинки кэширует service worker (vite.config.ts).

const cacheStore = createStore('bounce-cache', 'queries');
export const CACHE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
// при смене схемы данных - новое значение: старый кэш на устройствах отбрасывается
export const CACHE_BUSTER = 'schema-1762000000';
export const FILES_CACHE = 'bounce-files';

export const persister = createAsyncStoragePersister({
  key: 'bounce',
  throttleTime: 1000,
  storage: {
    getItem: (key) => get<string>(key, cacheStore).then((v) => v ?? null),
    setItem: (key, value: string) => set(key, value, cacheStore),
    removeItem: (key) => del(key, cacheStore),
  },
});

// выход: на устройстве не остаётся ни данных, ни картинок прежнего пользователя
export async function clearOfflineData(client: QueryClient): Promise<void> {
  client.clear();
  await persister.removeClient();
  if (typeof caches !== 'undefined') await caches.delete(FILES_CACHE);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
