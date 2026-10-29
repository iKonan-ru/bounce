import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { QueryClient } from '@tanstack/react-query';
import { createStore, del, get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { AUDIO_CACHE, stopKeepingAudio } from './audio-cache';
import { DAY_MS, SECOND_MS } from './format';

// Данные приложения остаются на устройстве (IndexedDB): без сети открываются последние
// загруженные проекты, песни и заметки. Картинки и прослушанное аудио кэширует service worker
// (vite.config.ts, lib/audio-cache.ts).

/** Сколько дней хранится кэш запросов на устройстве */
const CACHE_MAX_AGE_DAYS = 14;

/** Срок хранения кэша запросов на устройстве */
export const CACHE_MAX_AGE = CACHE_MAX_AGE_DAYS * DAY_MS;

/**
 * Версия кэша запросов
 *
 * При смене схемы данных или формы запроса ("Все заметки" стали постраничными) - новое
 * значение: старый кэш на устройствах отбрасывается
 */
export const CACHE_BUSTER = 'schema-1763600000';

/** Кэш картинок service worker */
export const FILES_CACHE = 'bounce-files';

/** Ключ кэша запросов в хранилище */
const PERSISTER_KEY = 'bounce';

/** Как часто кэш запросов записывается на устройство */
const PERSIST_THROTTLE_MS = SECOND_MS;

/** Хранилище кэша запросов в IndexedDB */
const cacheStore = createStore('bounce-cache', 'queries');

/** Запись кэша запросов на устройство */
export const persister = createAsyncStoragePersister({
  key: PERSISTER_KEY,
  throttleTime: PERSIST_THROTTLE_MS,
  storage: {
    getItem: (key) => get<string>(key, cacheStore).then((value) => value ?? null),
    setItem: (key, value: string) => set(key, value, cacheStore),
    removeItem: (key) => del(key, cacheStore),
  },
});

/** Выход: на устройстве не остаётся ни данных, ни картинок, ни аудио прежнего пользователя */
export async function clearOfflineData(client: QueryClient): Promise<void> {
  client.clear();
  await persister.removeClient();
  // идущая загрузка аудио иначе положила бы файл в только что стёртый кэш
  stopKeepingAudio();
  if (typeof caches !== 'undefined') {
    await Promise.all([caches.delete(FILES_CACHE), caches.delete(AUDIO_CACHE)]);
  }
}

/** Подписка на появление и пропадание сети */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Есть ли сеть по мнению браузера */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
