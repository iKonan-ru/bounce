import type { QueryClient } from '@tanstack/react-query';
import { NOTE_ACCESS_EVENT } from '../constants/note-access';
import { getField } from '../utils/guards';
import { stopKeepingAudio } from './audio-cache';
import { saveNoteFileAccess } from './note-files';
import { persister } from './offline';
import { pb } from './pb';
import { Collections } from './pb-types';
import { queryKeys } from './query-keys';

/** Версия доступа: запоздалый запрос не должен вернуть закрытые записи в кэш */
let accessVersion = 0;

/** Версия перед загрузкой проекта для офлайна */
export function getNoteAccessVersion(): number {
  return accessVersion;
}

/** Id из обычной ленты или страниц поиска */
function getCachedIds(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.flatMap((note) => {
      const id = getField(note, 'id');

      return typeof id === 'string' ? [id] : [];
    });
  }

  const pages = getField(data, 'pages');

  if (!Array.isArray(pages)) {
    return [];
  }

  return pages.flatMap((page) => getCachedIds(getField(page, 'items')));
}

/** Закрытые записи удаляются и из неоткрытых страниц, и из сохраненного снимка */
async function resetNotes(client: QueryClient): Promise<void> {
  await client.cancelQueries({ queryKey: queryKeys.notes.all });
  client.removeQueries({ queryKey: queryKeys.notes.all, type: 'inactive' });
  await client.resetQueries({ queryKey: queryKeys.notes.all });
  await persister.removeClient();
}

/** Проверить видимость заново после сигнала сервера или возвращения в приложение */
export async function refreshNoteAccess(
  client: QueryClient,
  isRevocation = false
): Promise<void> {
  if (!navigator.onLine || !pb.authStore.isValid) {
    return;
  }

  const version = ++accessVersion;
  const userId = pb.authStore.record?.id;
  try {
    if (isRevocation) {
      stopKeepingAudio();
      await saveNoteFileAccess([], false);
      window.dispatchEvent(new CustomEvent(NOTE_ACCESS_EVENT, { detail: [] }));
      await resetNotes(client);
    }

    const notes = await pb
      .collection(Collections.Notes)
      .getFullList<{ id: string }>({ fields: 'id' });
    const isCurrent =
      version === accessVersion && userId === pb.authStore.record?.id;

    if (!isCurrent) {
      return;
    }

    const ids = notes.map((note) => note.id);
    const idSet = new Set(ids);
    const queries = client
      .getQueryCache()
      .findAll({ queryKey: queryKeys.notes.all });
    const hasRevoked = queries.some((query) =>
      getCachedIds(query.state.data).some((id) => !idSet.has(id))
    );
    window.dispatchEvent(new CustomEvent(NOTE_ACCESS_EVENT, { detail: ids }));
    await saveNoteFileAccess(ids);

    if (hasRevoked) {
      await resetNotes(client);
    }
  } catch (error) {
    console.error(error);

    if (isRevocation && version === accessVersion) {
      await saveNoteFileAccess([]);
    }
  }
}
