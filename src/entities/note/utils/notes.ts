import type PocketBase from 'pocketbase';
import type { NoteScope } from '@/shared/types';
import {
  NOTE_LEVEL_FILTER,
  WHITESPACE_RE,
  SEARCH_WORDS_MAX,
} from '../constants/notes';
import type { NotesFilter } from '../types/notes';

/** Исходное имя файла; у Blob без имени - пусто */
export function getOriginalFileName(file: File | Blob): string {
  return file instanceof File ? file.name : '';
}

/** Заметки одного уровня: у проекта - только заметки самого проекта, без песен и этапов */
export function getScopeFilter(client: PocketBase, scope: NoteScope): string {
  if (scope.stage) {
    return client.filter('stage = {:stage}', { stage: scope.stage });
  }

  if (scope.song) {
    return client.filter('song = {:song} && stage = ""', { song: scope.song });
  }

  return client.filter('project = {:project} && song = ""', {
    project: scope.project,
  });
}

/** Фильтр раздела "Все заметки": заметки проекта, песен и этапов вместе */
export function getNotesFilter(
  client: PocketBase,
  project: string,
  filter: NotesFilter
): string {
  const parts = [client.filter('project = {:project}', { project })];
  const levelFilter = NOTE_LEVEL_FILTER[filter.level];

  if (levelFilter) {
    parts.push(levelFilter);
  }

  if (filter.song) {
    parts.push(client.filter('song = {:song}', { song: filter.song }));
  }

  if (filter.author) {
    parts.push(client.filter('author = {:author}', { author: filter.author }));
  }

  if (filter.hasImages) {
    parts.push('images:length > 0');
  }

  const words = filter.text
    .trim()
    .split(WHITESPACE_RE)
    .filter(Boolean)
    .slice(0, SEARCH_WORDS_MAX);
  for (const word of words) {
    parts.push(client.filter('text ~ {:word}', { word }));
  }

  return parts.join(' && ');
}
