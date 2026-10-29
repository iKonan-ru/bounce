import type PocketBase from 'pocketbase';
import type { Note } from './model';
import { Collections, getCollection } from './pb';
import { sendRecordForm } from './upload';

/** Где заметка: у проекта, песни или этапа (песня и этап - того же проекта) */
export interface NoteScope {
  project: string;
  song?: string;
  stage?: string;
}

/** Новая заметка */
export interface NewNote {
  /** Свой id записи: повторная отправка той же заметки не создаёт вторую (сервер ответит, что такой id уже есть) */
  id?: string;
  text: string;
  audio?: readonly (File | Blob)[];
  images?: readonly (File | Blob)[];
}

/** Связи заметки, которые приходят вместе с ней */
export const NOTE_EXPAND = 'author,song,stage';

/** Уровень заметок в разделе "Все заметки" */
export enum NoteLevel {
  /** Все уровни сразу */
  All = 'all',
  /** Заметки проекта */
  Project = 'project',
  /** Заметки песен */
  Song = 'song',
  /** Заметки этапов */
  Stage = 'stage',
}

/** Порядок заметок */
export enum NoteSort {
  /** Сначала новые */
  Newest = 'new',
  /** Сначала старые */
  Oldest = 'old',
}

/** Фильтр раздела "Все заметки" */
export interface NotesFilter {
  text: string;
  level: NoteLevel;
  song: string;
  author: string;
  hasImages: boolean;
}

/** Пустой фильтр: все заметки проекта */
export const EMPTY_NOTES_FILTER: NotesFilter = {
  text: '',
  level: NoteLevel.All,
  song: '',
  author: '',
  hasImages: false,
};

/** Условие PocketBase для уровня заметок; пусто - любой уровень */
const NOTE_LEVEL_FILTER: Record<NoteLevel, string> = {
  [NoteLevel.All]: '',
  [NoteLevel.Project]: 'song = ""',
  [NoteLevel.Song]: 'song != "" && stage = ""',
  [NoteLevel.Stage]: 'stage != ""',
};

/** Сколько слов поиска учитывается */
const SEARCH_WORDS_MAX = 5;

/** Пробелы между словами поиска */
const WHITESPACE_RE = /\s+/;

/** Исходное имя файла; у Blob без имени - пусто */
function getOriginalFileName(file: File | Blob): string {
  return file instanceof File ? file.name : '';
}

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

/** Как показывать аудио во вложениях */
export enum AudioView {
  /** Плееры столбиком: у отправленной заметки */
  Players = 'players',
  /** Имена файлов в строку: у ждущей отправки */
  Names = 'names',
}
