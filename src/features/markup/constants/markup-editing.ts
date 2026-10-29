import { InlineKind, BlockKind } from '@/shared/types';
import type { MarkupAction, LineBlockKind } from '../types/markup-editing';

/** Формат текста в буфере обмена */
export const CLIPBOARD_TEXT_FORMAT = 'text';

/** Маркеры оформления, которыми оборачивается выделение */
export const WRAP_MARKER: Partial<Record<MarkupAction, string>> = {
  [InlineKind.Bold]: '**',
  [InlineKind.Italic]: '*',
  [InlineKind.Underline]: '__',
  [InlineKind.Strike]: '~~',
  [InlineKind.Code]: '`',
};

/** Действия, которые ставят вид всем строкам выделения */
export const LINE_BLOCK_KINDS: ReadonlySet<MarkupAction> =
  new Set<MarkupAction>([
    BlockKind.List,
    BlockKind.OrderedList,
    BlockKind.Quote,
  ]);

/** Начало строки списка, нумерованного списка и цитаты (\u2022 - буллет) */
export const LINE_PREFIX_RE: Record<LineBlockKind, RegExp> = {
  [BlockKind.List]: /^\s*[-*\u2022]\s+/,
  [BlockKind.OrderedList]: /^\s*\d{1,3}[.)]\s+/,
  [BlockKind.Quote]: /^\s*>\s?/,
};

/** Маркер строки списка */
export const LIST_LINE_MARKER = '- ';

/** Маркер строки цитаты */
export const QUOTE_LINE_MARKER = '> ';

/** Разделитель после номера строки нумерованного списка */
export const ORDERED_LINE_SEPARATOR = '. ';

/** Перенос строки */
export const LINE_BREAK = '\n';

/** indexOf не нашёл перенос строки */
export const NOT_FOUND_INDEX = -1;

/** Подпись ссылки, когда ничего не выделено */
export const DEFAULT_LINK_CAPTION = 'ссылка';

/** Адрес ссылки, который пользователь допишет сам */
export const DEFAULT_LINK_URL = 'https://';

/** Сколько знаков, кроме подписи, стоит перед адресом в [подпись](адрес): "[" и "](" */
export const LINK_URL_OFFSET = 3;

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
