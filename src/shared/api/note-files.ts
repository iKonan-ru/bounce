import { AUDIO_CACHE } from '../constants/audio-cache';
import {
  NOTE_ACCESS_CACHE,
  NOTE_ACCESS_KEY,
  NOTES_COLLECTION_ID,
} from '../constants/note-access';
import { FILES_CACHE } from '../constants/offline';

/** Id заметки в файловом адресе; для остальных файлов - пусто */
export function getFileNoteId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  const isNote = parts[3] === NOTES_COLLECTION_ID || parts[3] === 'notes';

  return isNote ? (parts[4] ?? '') : '';
}

/** Снимок разрешений общий для окон приложения и service worker */
export async function saveNoteFileAccess(
  ids: readonly string[],
  shouldPrune = true
): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }

  const cache = await caches.open(NOTE_ACCESS_CACHE);
  await cache.put(NOTE_ACCESS_KEY, new Response(JSON.stringify(ids)));

  if (!shouldPrune) {
    return;
  }

  for (const name of [FILES_CACHE, AUDIO_CACHE]) {
    const files = await caches.open(name);
    for (const request of await files.keys()) {
      const id = getFileNoteId(request.url);

      if (id && !ids.includes(id)) {
        await files.delete(request);
      }
    }
  }
}

/** Прямое чтение аудиокэша подчиняется той же видимости, что и service worker */
export async function checkCanReadNoteFile(url: string): Promise<boolean> {
  const id = getFileNoteId(url);

  if (!id) {
    return true;
  }

  if (typeof caches === 'undefined') {
    return false;
  }

  const cache = await caches.open(NOTE_ACCESS_CACHE);
  const response = await cache.match(NOTE_ACCESS_KEY);
  const ids: string[] = response ? await response.json() : [];

  return ids.includes(id);
}
