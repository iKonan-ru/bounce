// Упоминания людей: в тексте хранится логин (@pasha) - он не меняется, а при показе вместо него
// выводится имя. Логин - как в схеме users: латиница, цифры, точка, дефис, подчёркивание.

/** Упоминание @логин в тексте */
export const MENTION_RE = /@([a-z0-9][a-z0-9_.-]{1,30}[a-z0-9])/g;

/** Символ перед "@", с которым это не упоминание: часть слова или почты */
const WORD_BEFORE_MENTION_RE = /[\p{L}\p{N}_.@-]/u;

/** Набираемое упоминание перед курсором: "@" в начале, после пробела, скобки или кавычки */
const TYPED_MENTION_RE = /(^|[\s(\u00AB"'])@([\p{L}\p{N}_.-]{0,32})$/u;

/** Сколько людей подсказывать при упоминании */
const MENTION_SUGGESTIONS_MAX = 6;

/** Пробелы между словами имени */
const WHITESPACE_RE = /\s+/;

/** Человек, которого можно упомянуть */
export interface Person {
  id: string;
  username: string;
  name: string;
}

/** Вид части текста с упоминаниями */
export enum MentionPartKind {
  /** Обычный текст */
  Text = 'text',
  /** Упоминание @username */
  Mention = 'mention',
}

/** Часть текста: обычный текст или упоминание (для показа имени вместо логина) */
export type MentionPart =
  | { kind: MentionPartKind.Text; text: string }
  | { kind: MentionPartKind.Mention; username: string };

/** Набираемое упоминание: где начинается и что набрано после "@" */
export interface MentionQuery {
  start: number;
  query: string;
}

/** Текст после вставки упоминания и место курсора */
export interface MentionInsert {
  value: string;
  caret: number;
}

/** Совпадение - отдельное упоминание, а не часть слова или почты */
function checkIsStandaloneMention(
  text: string,
  match: RegExpExecArray
): boolean {
  if (match.index === 0) {
    return true;
  }

  const charBefore = text[match.index - 1] ?? '';

  return !WORD_BEFORE_MENTION_RE.test(charBefore);
}

/** Логины, упомянутые в тексте (по одному разу, в порядке появления) */
export function getMentionedUsernames(text: string): string[] {
  const usernames = Array.from(text.matchAll(MENTION_RE))
    .filter((match) => checkIsStandaloneMention(text, match))
    .map((match) => match[1] ?? '');

  return [...new Set(usernames)];
}

/** Id людей, упомянутых в тексте */
export function getMentionedIds(
  text: string,
  people: readonly Person[]
): string[] {
  const usernames = getMentionedUsernames(text);

  return people
    .filter((person) => usernames.includes(person.username))
    .map((person) => person.id);
}

/** Части текста: обычный текст и упоминания */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MENTION_RE)) {
    if (!checkIsStandaloneMention(text, match)) {
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({
        kind: MentionPartKind.Text,
        text: text.slice(lastIndex, match.index),
      });
    }

    parts.push({ kind: MentionPartKind.Mention, username: match[1] ?? '' });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ kind: MentionPartKind.Text, text: text.slice(lastIndex) });
  }

  return parts;
}

/**
 * Что набирают сразу после "@" перед курсором: начало упоминания и запрос (логин или имя, можно
 * по-русски)
 *
 * Null - курсор не в упоминании
 */
export function getMentionQuery(
  value: string,
  caret: number
): MentionQuery | null {
  const match = TYPED_MENTION_RE.exec(value.slice(0, caret));

  if (!match) {
    return null;
  }

  const query = match[2] ?? '';

  return { start: caret - query.length - 1, query };
}

/** Логин или любое слово имени начинается с запроса */
function checkMatchesQuery(person: Person, query: string): boolean {
  if (query === '' || person.username.startsWith(query)) {
    return true;
  }

  return person.name
    .toLowerCase()
    .split(WHITESPACE_RE)
    .some((word) => word.startsWith(query));
}

/** Подходящие люди: логин или любое слово имени начинается с запроса */
export function getMatchingPeople(
  people: readonly Person[],
  query: string,
  limit = MENTION_SUGGESTIONS_MAX
): Person[] {
  const lowerQuery = query.toLowerCase();

  return people
    .filter((person) => checkMatchesQuery(person, lowerQuery))
    .slice(0, limit);
}

/** Вставить "@логин " вместо набранного запроса; курсор - после пробела */
export function insertMention(
  value: string,
  start: number,
  caret: number,
  username: string
): MentionInsert {
  const tail = value.slice(caret);
  const separator = tail.startsWith(' ') ? '' : ' ';
  const inserted = `@${username}${separator}`;

  return {
    value: value.slice(0, start) + inserted + tail,
    caret: start + inserted.length,
  };
}

/** id строки списка упоминаний: id списка и номер строки (для aria-activedescendant) */
export function getMentionOptionId(listId: string, index: number): string {
  return `${listId}-${index}`;
}
