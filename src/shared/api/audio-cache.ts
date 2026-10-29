// Аудио на устройстве: запись, которую запустили, скачивается целиком в кэш service worker
// (маршрут bounce-audio в vite.config.ts) и дальше играет оттуда - без сети и без повторной
// загрузки. Сам плеер просит файл кусками, а куски в кэш не попадают, поэтому файл скачивается
// отдельным запросом, когда запись уже играет. Скачивается одна запись за раз: другая запись,
// остановка плеера или выход отменяют загрузку.
import {
  AUDIO_CACHE,
  CACHE_CHECKS,
  CACHE_CHECK_MS,
  DOWNLOADING_FRACTION_MAX,
  PROGRESS_STEP,
  FULL_FRACTION,
  AUDIO_CACHE_MAX,
} from '../constants/audio-cache';
import type { AudioDownload, ProgressHandler } from '../types/audio-cache';
import { delay } from '../utils/timers';

/** Загрузка, которая идёт сейчас; null - ничего не качается */
let currentDownload: AudioDownload | null = null;

/** Ключ кэша - адрес без файлового токена: токен живёт час, файл - пока его не заменят */
export function getAudioCacheKey(url: string): string {
  const cacheUrl = new URL(url, location.href);
  cacheUrl.searchParams.delete('token');

  return cacheUrl.href;
}

/** Запись уже лежит в кэше устройства */
export async function checkIsAudioCached(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false;
  }

  try {
    const cached = await caches.match(getAudioCacheKey(url), {
      cacheName: AUDIO_CACHE,
    });

    return Boolean(cached);
  } catch {
    return false;
  }
}

/** Остановить загрузку записи на устройство */
export function stopKeepingAudio(): void {
  if (currentDownload) {
    currentDownload.abort.abort();
  }

  currentDownload = null;
}

/** Ждать, пока service worker положит файл в кэш; true - лежит */
async function waitUntilCached(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < CACHE_CHECKS; attempt++) {
    if (await checkIsAudioCached(url)) {
      return true;
    }

    await delay(CACHE_CHECK_MS);
  }

  return checkIsAudioCached(url);
}

/**
 * Дочитать ответ до конца, сообщая долю шагами по проценту
 *
 * Тело сразу отбрасывается: в память файл не собирается, а запрос живёт, пока service worker не
 * допишет файл в кэш
 */
async function readThrough(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  total: number,
  reportProgress: ProgressHandler
): Promise<void> {
  let loadedBytes = 0;
  let reportedFraction = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    loadedBytes += part.value.byteLength;

    if (total <= 0) {
      continue;
    }

    const fraction = Math.min(loadedBytes / total, DOWNLOADING_FRACTION_MAX);

    if (fraction - reportedFraction >= PROGRESS_STEP) {
      reportedFraction = fraction;
      reportProgress(fraction);
    }
  }
}

/** Скачать запись на устройство; onProgress - доля скачанного (0..1) для полосы плеера, 1 - запись уже на устройстве */
export async function keepAudio(
  url: string,
  onProgress?: ProgressHandler
): Promise<void> {
  const reportProgress: ProgressHandler = (fraction) => {
    if (onProgress) {
      onProgress(fraction);
    }
  };
  // без service worker сохранять некому: ответ ушёл бы в никуда
  const hasServiceWorker = Boolean(navigator.serviceWorker?.controller);

  if (typeof caches === 'undefined' || !hasServiceWorker) {
    return;
  }

  const key = getAudioCacheKey(url);

  if (currentDownload?.key === key) {
    return;
  }

  stopKeepingAudio();
  const download: AudioDownload = { key, abort: new AbortController() };
  currentDownload = download;
  try {
    if (await checkIsAudioCached(url)) {
      reportProgress(FULL_FRACTION);

      return;
    }

    if (download.abort.signal.aborted) {
      return;
    }

    const response = await fetch(url, { signal: download.abort.signal });
    const total = Number(response.headers.get('content-length') ?? 0);

    // большой файл service worker не сохранит - не качаем его зря
    if (total > AUDIO_CACHE_MAX) {
      download.abort.abort();

      return;
    }

    const reader = response.body?.getReader();

    if (!reader) {
      return;
    }

    await readThrough(reader, total, reportProgress);
    // файл дочитан, но в кэш мог и не попасть (нет места): полоса - по тому, что в кэше
    const isCached = await waitUntilCached(url);
    const savedFraction = isCached ? FULL_FRACTION : 0;
    reportProgress(savedFraction);
  } catch (error) {
    // нет сети, отменили или не хватило места - запись просто будет грузиться из сети
    console.error(error);
  } finally {
    if (currentDownload === download) {
      currentDownload = null;
    }
  }
}
