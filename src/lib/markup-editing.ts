// Правка разметки (lib/markup.ts) в поле ввода: оформление выделения, списки, цитаты, ссылки.
import { BlockKind, InlineKind } from '@/shared/types';

/** Вид строк, который ставится всем строкам выделения: список, нумерованный список или цитата */
type LineBlockKind = BlockKind.List | BlockKind.OrderedList | BlockKind.Quote;

/** Действие панели оформления: оформить выделенный текст, сделать ссылку или вид строк */
export type MarkupAction =
  | InlineKind.Bold
  | InlineKind.Italic
  | InlineKind.Underline
  | InlineKind.Strike
  | InlineKind.Code
  | InlineKind.Link
  | LineBlockKind;

/** Правка текста поля: новый текст и выделение после неё */
export interface TextEdit {
  /** Текст поля */
  value: string;
  /** Начало выделения */
  start: number;
  /** Конец выделения */
  end: number;
}

/** Маркеры оформления, которыми оборачивается выделение */
const WRAP_MARKER: Partial<Record<MarkupAction, string>> = {
  [InlineKind.Bold]: '**',
  [InlineKind.Italic]: '*',
  [InlineKind.Underline]: '__',
  [InlineKind.Strike]: '~~',
  [InlineKind.Code]: '`',
};

/** Действия, которые ставят вид всем строкам выделения */
const LINE_BLOCK_KINDS: ReadonlySet<MarkupAction> = new Set<MarkupAction>([
  BlockKind.List,
  BlockKind.OrderedList,
  BlockKind.Quote,
]);

/** Начало строки списка, нумерованного списка и цитаты (\u2022 - буллет) */
const LINE_PREFIX_RE: Record<LineBlockKind, RegExp> = {
  [BlockKind.List]: /^\s*[-*\u2022]\s+/,
  [BlockKind.OrderedList]: /^\s*\d{1,3}[.)]\s+/,
  [BlockKind.Quote]: /^\s*>\s?/,
};

/** Маркер строки списка */
const LIST_LINE_MARKER = '- ';

/** Маркер строки цитаты */
const QUOTE_LINE_MARKER = '> ';

/** Разделитель после номера строки нумерованного списка */
const ORDERED_LINE_SEPARATOR = '. ';

/** Перенос строки */
const LINE_BREAK = '\n';

/** indexOf не нашёл перенос строки */
const NOT_FOUND_INDEX = -1;

/** Подпись ссылки, когда ничего не выделено */
const DEFAULT_LINK_CAPTION = 'ссылка';

/** Адрес ссылки, который пользователь допишет сам */
const DEFAULT_LINK_URL = 'https://';

/** Сколько знаков, кроме подписи, стоит перед адресом в [подпись](адрес): "[" и "](" */
const LINK_URL_OFFSET = 3;

/** Действия по сочетанию Cmd/Ctrl + клавиша; в русской раскладке - те же клавиши */
export const SHORTCUT_ACTIONS: Record<string, MarkupAction> = {
  b: InlineKind.Bold,
  i: InlineKind.Italic,
  u: InlineKind.Underline,
  k: InlineKind.Link,
  и: InlineKind.Bold,
  ш: InlineKind.Italic,
  г: InlineKind.Underline,
  л: InlineKind.Link,
};

/** Действие ставит вид всем строкам выделения */
function checkIsLineBlockKind(action: MarkupAction): action is LineBlockKind {
  return LINE_BLOCK_KINDS.has(action);
}

/** Обернуть выделение маркером; уже обёрнутое - развернуть */
function wrapSelection(edit: TextEdit, marker: string): TextEdit {
  const { value, start, end } = edit;
  const before = value.slice(0, start);
  const selection = value.slice(start, end);
  const after = value.slice(end);
  const isWrapped = before.endsWith(marker) && after.startsWith(marker);

  if (isWrapped) {
    return {
      value:
        before.slice(0, -marker.length) +
        selection +
        after.slice(marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  }

  return {
    value: before + marker + selection + marker + after,
    start: start + marker.length,
    end: end + marker.length,
  };
}

/** Маркер строки нужного вида; у нумерованного списка - номер строки в выделении */
function getLineMarker(kind: LineBlockKind, index: number): string {
  if (kind === BlockKind.List) {
    return LIST_LINE_MARKER;
  }

  if (kind === BlockKind.OrderedList) {
    return `${index + 1}${ORDERED_LINE_SEPARATOR}`;
  }

  return QUOTE_LINE_MARKER;
}

/** Строка без маркера списка, нумерованного списка и цитаты */
function removeLinePrefix(line: string): string {
  return line
    .replace(LINE_PREFIX_RE[BlockKind.List], '')
    .replace(LINE_PREFIX_RE[BlockKind.OrderedList], '')
    .replace(LINE_PREFIX_RE[BlockKind.Quote], '');
}

/** Список или цитата для всех строк выделения; если все строки уже такие - убрать */
function toggleLinePrefix(edit: TextEdit, kind: LineBlockKind): TextEdit {
  const { value } = edit;
  const blockStart = value.lastIndexOf(LINE_BREAK, edit.start - 1) + 1;
  const breakIndex = value.indexOf(LINE_BREAK, edit.end);
  const blockEnd = breakIndex === NOT_FOUND_INDEX ? value.length : breakIndex;
  const blockLines = value.slice(blockStart, blockEnd).split(LINE_BREAK);
  const prefixRe = LINE_PREFIX_RE[kind];
  const areAllPrefixed = blockLines.every((line) => prefixRe.test(line));
  const nextLines = blockLines.map((line, index) => {
    const bareLine = removeLinePrefix(line);

    if (areAllPrefixed) {
      return bareLine;
    }

    return `${getLineMarker(kind, index)}${bareLine}`;
  });
  const text = nextLines.join(LINE_BREAK);

  return {
    value: value.slice(0, blockStart) + text + value.slice(blockEnd),
    start: blockStart,
    end: blockStart + text.length,
  };
}

/** Ссылка: выделенный текст становится подписью, курсор - на месте адреса */
export function insertLink(edit: TextEdit, url?: string): TextEdit {
  const { value, start, end } = edit;
  const caption = value.slice(start, end) || DEFAULT_LINK_CAPTION;
  const target = url ?? DEFAULT_LINK_URL;
  const text = `[${caption}](${target})`;
  const nextValue = value.slice(0, start) + text + value.slice(end);

  if (url) {
    const caret = start + text.length;

    return { value: nextValue, start: caret, end: caret };
  }

  const urlStart = start + caption.length + LINK_URL_OFFSET;

  return { value: nextValue, start: urlStart, end: urlStart + target.length };
}

/** Применить действие панели к выделению */
export function applyAction(edit: TextEdit, action: MarkupAction): TextEdit {
  const marker = WRAP_MARKER[action];

  if (marker) {
    return wrapSelection(edit, marker);
  }

  if (checkIsLineBlockKind(action)) {
    return toggleLinePrefix(edit, action);
  }

  return insertLink(edit);
}
