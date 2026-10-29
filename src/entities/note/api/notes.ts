import type PocketBase from 'pocketbase';
import { sendRecordForm, Collections, getCollection } from '@/shared/api';
import type { NoteScope } from '@/shared/types';
import { NOTE_EXPAND } from '../constants/notes';
import type { Note } from '../types/note';
import type { NewNote } from '../types/notes';
import { getOriginalFileName } from '../utils/notes';

/** Создать заметку; onProgress - доля отправленного (0..1), с ним запись уходит через XMLHttpRequest (только браузер) */
export function createNote(
  client: PocketBase,
  scope: NoteScope,
  author: string,
  input: NewNote,
  onProgress?: (fraction: number) => void
): Promise<Note> {
  const form = new FormData();

  if (input.id) {
    form.set('id', input.id);
  }

  form.set('project', scope.project);

  if (scope.song) {
    form.set('song', scope.song);
  }

  if (scope.stage) {
    form.set('stage', scope.stage);
  }

  form.set('text', input.text.trim());
  form.set('author', author);
  const audio = input.audio ?? [];
  for (const file of audio) {
    form.append('audio', file);
  }

  // имена как у человека на диске: сервер оставляет в именах файлов только латиницу
  if (audio.length > 0) {
    form.set('audio_names', JSON.stringify(audio.map(getOriginalFileName)));
  }

  for (const file of input.images ?? []) {
    form.append('images', file);
  }
  const canTrackProgress = onProgress && typeof XMLHttpRequest !== 'undefined';

  if (canTrackProgress) {
    return sendRecordForm<Note>(Collections.Notes, form, {
      expand: NOTE_EXPAND,
      onProgress,
    });
  }

  return getCollection(client, Collections.Notes).create<Note>(form, {
    expand: NOTE_EXPAND,
  });
}
