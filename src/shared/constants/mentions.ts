/** Упоминание @логин в тексте */
export const MENTION_RE = /@([a-z0-9][a-z0-9_.-]{1,30}[a-z0-9])/g;

/** Символ перед "@", с которым это не упоминание: часть слова или почты */
export const WORD_BEFORE_MENTION_RE = /[\p{L}\p{N}_.@-]/u;

/** Набираемое упоминание перед курсором: "@" в начале, после пробела, скобки или кавычки */
export const TYPED_MENTION_RE = /(^|[\s(\u00AB"'])@([\p{L}\p{N}_.-]{0,32})$/u;

/** Сколько людей подсказывать при упоминании */
export const MENTION_SUGGESTIONS_MAX = 6;

/** Пробелы между словами имени */
export const WHITESPACE_RE = /\s+/;
