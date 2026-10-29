// Упоминания людей: в тексте хранится логин (@pasha) - он не меняется, а при показе вместо него
// выводится имя. Логин - как в схеме users: латиница, цифры, точка, дефис, подчёркивание.
import {
  WORD_BEFORE_MENTION_RE,
  MENTION_RE,
  TYPED_MENTION_RE,
  WHITESPACE_RE,
  MENTION_SUGGESTIONS_MAX,
} from '../constants/mentions';
import type {
  Person,
  MentionPart,
  MentionQuery,
  MentionInsert,
} from '../types/mentions';
import { MentionPartKind } from '../types/mentions';

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
