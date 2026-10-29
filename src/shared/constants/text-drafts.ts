/** Начало ключа черновика новой заметки */
export const NOTE_DRAFT_PREFIX = 'bounce.draft.';

/** Начало ключа черновика текста песни */
export const LYRICS_DRAFT_PREFIX = 'bounce.lyrics-draft.';

/** Начала ключей всех черновиков */
export const DRAFT_PREFIXES: readonly string[] = [
  NOTE_DRAFT_PREFIX,
  LYRICS_DRAFT_PREFIX,
];
