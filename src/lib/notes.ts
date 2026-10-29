import type PocketBase from 'pocketbase';
import type { Note } from './model';
import { collection } from './pb';
import { sendRecordForm } from './upload';

// Где заметка: у проекта, песни или этапа (песня и этап - того же проекта).
export type NoteScope = { project: string; song?: string; stage?: string };

export type NewNote = {
  // свой id записи: повторная отправка той же заметки не создаёт вторую (сервер ответит, что
  // такой id уже есть)
  id?: string;
  text: string;
  audio?: ReadonlyArray<File | Blob>;
  images?: ReadonlyArray<File | Blob>;
};

export const NOTE_EXPAND = 'author,song,stage';

// onProgress - доля отправленного (0..1); с ним запись уходит через XMLHttpRequest (только браузер)
export async function createNote(
  client: PocketBase,
  scope: NoteScope,
  author: string,
  input: NewNote,
  onProgress?: (fraction: number) => void,
): Promise<Note> {
  const form = new FormData();
  if (input.id) form.set('id', input.id);
  form.set('project', scope.project);
  if (scope.song) form.set('song', scope.song);
  if (scope.stage) form.set('stage', scope.stage);
  form.set('text', input.text.trim());
  form.set('author', author);
  for (const f of input.audio ?? []) form.append('audio', f);
  // имена как у человека на диске: сервер оставляет в именах файлов только латиницу
  const names = (input.audio ?? []).map((f) => (f instanceof File ? f.name : ''));
  if (names.length > 0) form.set('audio_names', JSON.stringify(names));
  for (const f of input.images ?? []) form.append('images', f);
  if (onProgress && typeof XMLHttpRequest !== 'undefined') {
    return sendRecordForm<Note>('notes', form, { expand: NOTE_EXPAND, onProgress });
  }
  return collection(client, 'notes').create<Note>(form, { expand: NOTE_EXPAND });
}

// заметки одного уровня: у проекта - только заметки самого проекта, без песен и этапов
export function scopeFilter(client: PocketBase, scope: NoteScope): string {
  if (scope.stage) return client.filter('stage = {:stage}', { stage: scope.stage });
  if (scope.song) {
    return client.filter('song = {:song} && stage = ""', { song: scope.song });
  }
  return client.filter('project = {:project} && song = ""', { project: scope.project });
}

export type NoteLevel = 'all' | 'project' | 'song' | 'stage';
export type NoteSort = 'new' | 'old';
export type NotesFilter = {
  text: string;
  level: NoteLevel;
  song: string;
  author: string;
  withImages: boolean;
};

export const EMPTY_NOTES_FILTER: NotesFilter = {
  text: '',
  level: 'all',
  song: '',
  author: '',
  withImages: false,
};

// фильтр раздела "Все заметки": заметки проекта, песен и этапов вместе
export function notesFilter(client: PocketBase, project: string, f: NotesFilter): string {
  const parts = [client.filter('project = {:p}', { p: project })];
  if (f.level === 'project') parts.push('song = ""');
  if (f.level === 'song') parts.push('song != "" && stage = ""');
  if (f.level === 'stage') parts.push('stage != ""');
  if (f.song) parts.push(client.filter('song = {:s}', { s: f.song }));
  if (f.author) parts.push(client.filter('author = {:a}', { a: f.author }));
  if (f.withImages) parts.push('images:length > 0');
  const words = f.text.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  for (const w of words) parts.push(client.filter('text ~ {:w}', { w }));
  return parts.join(' && ');
}
