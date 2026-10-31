import type PocketBase from 'pocketbase';
import { ContentDirection } from '@/shared/types';
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
  if (scope.video_stage) {
    return client.filter('video_stage = {:id}', { id: scope.video_stage });
  }

  if (scope.video) {
    return client.filter('video = {:id} && video_stage = ""', {
      id: scope.video,
    });
  }

  if (scope.stage) {
    return client.filter('stage = {:stage}', { stage: scope.stage });
  }

  if (scope.song) {
    return client.filter('song = {:song} && stage = ""', { song: scope.song });
  }

  return client.filter('project = {:project} && song = "" && video = ""', {
    project: scope.project,
  });
}

/** Фильтр раздела "Все заметки": заметки проекта, песен и этапов вместе */
export function getNotesFilter(
  client: PocketBase,
  project: string,
  filter: NotesFilter
): string {
  const parts =
    project === 'all'
      ? []
      : [client.filter('project = {:project}', { project })];
  const levelFilter = NOTE_LEVEL_FILTER[filter.level];

  if (levelFilter) {
    parts.push(levelFilter);
  }

  if (filter.direction === ContentDirection.General) {
    parts.push('song = "" && video = ""');
  }

  if (filter.direction === ContentDirection.Music) {
    parts.push('song != ""');
  }

  if (filter.direction === ContentDirection.Video) {
    parts.push('video != ""');
  }

  if (filter.video) {
    parts.push(client.filter('video = {:video}', { video: filter.video }));
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
