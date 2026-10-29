/** Новая заметка */
export interface NewNote {
  /** Свой id записи: повторная отправка той же заметки не создаёт вторую (сервер ответит, что такой id уже есть) */
  id?: string;
  text: string;
  audio?: readonly (File | Blob)[];
  images?: readonly (File | Blob)[];
}

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

/** Как показывать аудио во вложениях */
export enum AudioView {
  /** Плееры столбиком: у отправленной заметки */
  Players = 'players',
  /** Имена файлов в строку: у ждущей отправки */
  Names = 'names',
}
