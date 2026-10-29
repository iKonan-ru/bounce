import type { KeyboardEvent, ClipboardEvent } from 'react';
import type { BlockKind, InlineKind } from '@/shared/types';

/** Результат хука правки разметки */
export interface UseMarkupEditingResult {
  /** Применить действие панели к выделению */
  onAction: (action: MarkupAction) => void;
  /** Сочетания клавиш; true - нажатие обработано */
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Вставка адреса поверх выделения; true - вставка обработана */
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => boolean;
}

/** Вид строк, который ставится всем строкам выделения: список, нумерованный список или цитата */
export type LineBlockKind =
  BlockKind.List | BlockKind.OrderedList | BlockKind.Quote;

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
