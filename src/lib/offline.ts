import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { QueryClient } from '@tanstack/react-query';
import { createStore, del, get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { AUDIO_CACHE, stopKeepingAudio } from './audio-cache';

// Данные приложения остаются на устройстве (IndexedDB): без сети открываются последние
// загруженные проекты, песни и заметки. Картинки и прослушанное аудио кэширует service worker
// (vite.config.ts, lib/audio-cache.ts).

const cacheStore = createStore('bounce-cache', 'queries');
export const CACHE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
// при смене схемы данных или формы запроса ("Все заметки" стали постраничными) - новое
// значение: старый кэш на устройствах отбрасывается
export const CACHE_BUSTER = 'schema-1763600000';
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

// выход: на устройстве не остаётся ни данных, ни картинок, ни аудио прежнего пользователя
export async function clearOfflineData(client: QueryClient): Promise<void> {
  client.clear();
  await persister.removeClient();
  // идущая загрузка аудио иначе положила бы файл в только что стёртый кэш
  stopKeepingAudio();
  if (typeof caches !== 'undefined') {
    await Promise.all([caches.delete(FILES_CACHE), caches.delete(AUDIO_CACHE)]);
  }
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
