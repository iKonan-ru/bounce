import type { NotesFilter } from '../types/notes';
import { NoteLevel } from '../types/notes';

/** Связи заметки, которые приходят вместе с ней */
export const NOTE_EXPAND = 'author,song,stage';

/** Пустой фильтр: все заметки проекта */
export const EMPTY_NOTES_FILTER: NotesFilter = {
  text: '',
  level: NoteLevel.All,
  song: '',
  author: '',
  hasImages: false,
};

/** Условие PocketBase для уровня заметок; пусто - любой уровень */
export const NOTE_LEVEL_FILTER: Record<NoteLevel, string> = {
  [NoteLevel.All]: '',
  [NoteLevel.Project]: 'song = ""',
  [NoteLevel.Song]: 'song != "" && stage = ""',
  [NoteLevel.Stage]: 'stage != ""',
};

/** Сколько слов поиска учитывается */
export const SEARCH_WORDS_MAX = 5;

/** Пробелы между словами поиска */
export const WHITESPACE_RE = /\s+/;
