/** Вид узла строки */
export enum InlineKind {
  /** Простой текст */
  Text = 'text',
  /** Жирный */
  Bold = 'bold',
  /** Курсив */
  Italic = 'italic',
  /** Подчёркнутый */
  Underline = 'underline',
  /** Зачёркнутый */
  Strike = 'strike',
  /** Код */
  Code = 'code',
  /** Ссылка */
  Link = 'link',
  /** Упоминание @username */
  Mention = 'mention',
}

/** Оформление текста */
export type StyleKind =
  | InlineKind.Bold
  | InlineKind.Italic
  | InlineKind.Underline
  | InlineKind.Strike;

/** Узел строки: текст, оформление, код, ссылка или упоминание */
export type Inline =
  | { kind: InlineKind.Text; text: string }
  | { kind: StyleKind; children: Inline[] }
  | { kind: InlineKind.Code; text: string }
  | { kind: InlineKind.Link; url: string; children: Inline[] | null }
  | { kind: InlineKind.Mention; username: string };

/** Вид блока текста */
export enum BlockKind {
  /** Абзац */
  Paragraph = 'p',
  /** Список */
  List = 'ul',
  /** Нумерованный список */
  OrderedList = 'ol',
  /** Цитата */
  Quote = 'quote',
}

/** Блок текста: абзац, список, нумерованный список или цитата */
export type Block =
  | { kind: BlockKind.Paragraph; lines: Inline[][] }
  | { kind: BlockKind.List; items: Inline[][] }
  | { kind: BlockKind.OrderedList; start: number; items: Inline[][] }
  | { kind: BlockKind.Quote; lines: Inline[][] };

/** Разобранное совпадение правила: узел и сколько текста он занял */
export interface ParsedMatch {
  length: number;
  node: Inline;
}

/** Найденный узел и где он начинается */
export interface Found extends ParsedMatch {
  index: number;
}

/** Правило разметки строки */
export interface Rule {
  pattern: RegExp;
  /** Граница: символы вокруг совпадения не должны быть буквой или цифрой (snake_case, 2*3*4) */
  hasWordBoundary?: boolean;
  /** Узел по совпадению; null - совпадение остаётся текстом */
  parse: (match: RegExpExecArray) => ParsedMatch | null;
}

/** Строки блока и индекс строки после блока */
export interface CollectedLines {
  items: Inline[][];
  nextIndex: number;
}

/** Ссылка в тексте */
export type Link = Extract<Inline, { kind: InlineKind.Link }>;

/** Сервис ссылки: подпись и вид страницы по пути */
export interface LinkService {
  host: RegExp;
  name: string;
  /** Что это за страница по частям пути */
  getKind?: (path: string[]) => string | undefined;
}
