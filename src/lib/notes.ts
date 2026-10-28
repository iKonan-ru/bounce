import type PocketBase from 'pocketbase';
import type { Note, NoteKind } from './model';
import { collection } from './pb';

// Где лента: у проекта, песни или этапа (песня и этап - того же проекта).
export type NoteScope = { project: string; song?: string; stage?: string };

export type NewNote = {
  kind: NoteKind;
  text: string;
  audio?: ReadonlyArray<File | Blob>;
  images?: ReadonlyArray<File | Blob>;
};

export async function createNote(
  client: PocketBase,
  scope: NoteScope,
  author: string,
  input: NewNote,
): Promise<Note> {
  const form = new FormData();
  form.set('project', scope.project);
  if (scope.song) form.set('song', scope.song);
  if (scope.stage) form.set('stage', scope.stage);
  form.set('kind', input.kind);
  form.set('text', input.text.trim());
  form.set('author', author);
  for (const f of input.audio ?? []) form.append('audio', f);
  for (const f of input.images ?? []) form.append('images', f);
  return collection(client, 'notes').create<Note>(form, { expand: 'author' });
}

// фильтр ленты одного уровня: у проекта - только записи самого проекта, без песен и этапов
export function scopeFilter(client: PocketBase, scope: NoteScope): string {
  if (scope.stage) return client.filter('stage = {:stage}', { stage: scope.stage });
  if (scope.song) {
    return client.filter('song = {:song} && stage = ""', { song: scope.song });
  }
  return client.filter('project = {:project} && song = ""', { project: scope.project });
}
