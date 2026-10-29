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
