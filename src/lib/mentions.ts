// Упоминания людей: в тексте хранится логин (@pasha) - он не меняется, а при показе вместо него
// выводится имя. Логин - как в схеме users: латиница, цифры, точка, дефис, подчёркивание.

export const MENTION_RE = /@([a-z0-9][a-z0-9_.-]{1,30}[a-z0-9])/g;
const BEFORE = /[\p{L}\p{N}_.@-]/u;

export type Person = { id: string; username: string; name: string };

// логины, упомянутые в тексте (по одному разу, в порядке появления)
export function mentionedUsernames(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION_RE)) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    if (before && BEFORE.test(before)) continue;
    const u = m[1] ?? '';
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

// id людей, упомянутых в тексте
export function mentionedIds(text: string, people: ReadonlyArray<Person>): string[] {
  const names = mentionedUsernames(text);
  return people.filter((p) => names.includes(p.username)).map((p) => p.id);
}

// Части текста: обычный текст и упоминания (для показа имени вместо логина).
export type MentionPart = { t: 'text'; text: string } | { t: 'mention'; username: string };

export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    if (before && BEFORE.test(before)) continue;
    if (m.index > last) parts.push({ t: 'text', text: text.slice(last, m.index) });
    parts.push({ t: 'mention', username: m[1] ?? '' });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: 'text', text: text.slice(last) });
  return parts;
}

// Что набирают сразу после "@" перед курсором: начало упоминания и запрос (логин или имя,
// можно по-русски). null - курсор не в упоминании.
export function mentionQuery(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const head = value.slice(0, caret);
  const m = /(^|[\s(«"'])@([\p{L}\p{N}_.-]{0,32})$/u.exec(head);
  if (!m) return null;
  const query = m[2] ?? '';
  return { start: caret - query.length - 1, query };
}

// Подходящие люди: логин или любое слово имени начинается с запроса.
export function matchPeople(people: ReadonlyArray<Person>, query: string, limit = 6): Person[] {
  const q = query.toLowerCase();
  return people
    .filter(
      (p) =>
        q === '' ||
        p.username.startsWith(q) ||
        p.name
          .toLowerCase()
          .split(/\s+/)
          .some((w) => w.startsWith(q)),
    )
    .slice(0, limit);
}

// Вставить "@логин " вместо набранного запроса; курсор - после пробела.
export function insertMention(
  value: string,
  start: number,
  caret: number,
  username: string,
): { value: string; caret: number } {
  const tail = value.slice(caret);
  const insert = `@${username}${tail.startsWith(' ') ? '' : ' '}`;
  return { value: value.slice(0, start) + insert + tail, caret: start + insert.length };
}
