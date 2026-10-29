import type { NoteSort } from '../types/notes';

/** Порядок заметок в разделе "Все заметки" */
export const NOTE_SORT_FIELD: Record<NoteSort, string> = {
  new: '-created',
  old: 'created',
};

/**
 * Раздел "Все заметки": сколько заметок в одной странице
 *
 * Заметки приходят страницами - весь проект за раз (с авторами, песнями и этапами) не грузится
 */
export const NOTES_PAGE = 40;
