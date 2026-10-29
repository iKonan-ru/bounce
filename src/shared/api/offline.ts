// Данные приложения остаются на устройстве (IndexedDB): без сети открываются последние
// загруженные проекты, песни и заметки. Картинки и прослушанное аудио кэширует service worker
// (vite.config.ts, lib/audio-cache.ts).
import { createStore, get, set, del } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { QueryClient } from '@tanstack/react-query';
import { AUDIO_CACHE } from '../constants/audio-cache';
import {
  PERSISTER_KEY,
  PERSIST_THROTTLE_MS,
  FILES_CACHE,
} from '../constants/offline';
import { stopKeepingAudio } from './audio-cache';

/** Хранилище кэша запросов в IndexedDB */
const cacheStore = createStore('bounce-cache', 'queries');

/** Запись кэша запросов на устройство */
export const persister = createAsyncStoragePersister({
  key: PERSISTER_KEY,
  throttleTime: PERSIST_THROTTLE_MS,
  storage: {
    getItem: (key) =>
      get<string>(key, cacheStore).then((value) => value ?? null),
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
export function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);

  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}
