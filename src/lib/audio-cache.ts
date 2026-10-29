// Аудио на устройстве: запись, которую запустили, скачивается целиком в кэш service worker
// (маршрут bounce-audio в vite.config.ts) и дальше играет оттуда - без сети и без повторной
// загрузки. Сам плеер просит файл кусками, а куски в кэш не попадают, поэтому файл скачивается
// отдельным запросом, когда запись уже играет. Скачивается одна запись за раз: другая запись,
// остановка плеера или выход отменяют загрузку.

export const AUDIO_CACHE = 'bounce-audio';
// больше - не кэшируется (тот же предел в vite.config.ts): телефону это стоило бы памяти
export const AUDIO_CACHE_MAX = 60 * 1024 * 1024;

// ключ кэша - адрес без файлового токена: токен живёт час, файл - пока его не заменят
export function audioCacheKey(url: string): string {
  const u = new URL(url, location.href);
  u.searchParams.delete('token');
  return u.href;
}

export async function isAudioCached(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    return Boolean(await caches.match(audioCacheKey(url), { cacheName: AUDIO_CACHE }));
  } catch {
    return false;
  }
}

let loading: { key: string; abort: AbortController } | null = null;

export function stopKeepingAudio(): void {
  loading?.abort.abort();
  loading = null;
}

export async function keepAudio(url: string): Promise<void> {
  // без service worker сохранять некому: ответ ушёл бы в никуда
  if (typeof caches === 'undefined' || !navigator.serviceWorker?.controller) return;
  const key = audioCacheKey(url);
  if (loading?.key === key) return;
  stopKeepingAudio();
  const job = { key, abort: new AbortController() };
  loading = job;
  try {
    if (await isAudioCached(url)) return;
    if (job.abort.signal.aborted) return;
    const res = await fetch(url, { signal: job.abort.signal });
    // большой файл service worker не сохранит - не качаем его зря
    if (Number(res.headers.get('content-length') ?? 0) > AUDIO_CACHE_MAX) {
      job.abort.abort();
      return;
    }
    // Тело читается до конца и сразу отбрасывается: в память файл не собирается, а запрос
    // живёт, пока service worker не допишет файл в кэш.
    const reader = res.body?.getReader();
    if (reader) while (!(await reader.read()).done);
  } catch {
    // нет сети, отменили или не хватило места - запись просто будет грузиться из сети
  } finally {
    if (loading === job) loading = null;
  }
}
