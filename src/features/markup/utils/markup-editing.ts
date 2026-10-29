// Правка разметки (shared/utils/markup.ts) в поле ввода: оформление выделения, списки, цитаты, ссылки.
import { BlockKind } from '@/shared/types';
import {
  LINE_BLOCK_KINDS,
  LIST_LINE_MARKER,
  ORDERED_LINE_SEPARATOR,
  QUOTE_LINE_MARKER,
  LINE_PREFIX_RE,
  LINE_BREAK,
  NOT_FOUND_INDEX,
  DEFAULT_LINK_CAPTION,
  DEFAULT_LINK_URL,
  LINK_URL_OFFSET,
  WRAP_MARKER,
} from '../constants/markup-editing';
import type {
  MarkupAction,
  LineBlockKind,
  TextEdit,
} from '../types/markup-editing';

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
