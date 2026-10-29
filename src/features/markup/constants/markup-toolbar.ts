import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  TextQuote,
  Code,
  Link,
} from 'lucide-react';
import { InlineKind, BlockKind } from '@/shared/types';
import type { MarkupButton } from '../types/markup-toolbar';

/** Кнопки панели оформления по порядку */
export const MARKUP_BUTTONS: readonly MarkupButton[] = [
  { action: InlineKind.Bold, label: 'Жирный', icon: Bold },
  { action: InlineKind.Italic, label: 'Курсив', icon: Italic },
  { action: InlineKind.Underline, label: 'Подчёркнутый', icon: Underline },
  { action: InlineKind.Strike, label: 'Зачёркнутый', icon: Strikethrough },
  { action: BlockKind.List, label: 'Список', icon: List },
  {
    action: BlockKind.OrderedList,
    label: 'Нумерованный список',
    icon: ListOrdered,
  },
  { action: BlockKind.Quote, label: 'Цитата', icon: TextQuote },
  { action: InlineKind.Code, label: 'Моноширинный', icon: Code },
  { action: InlineKind.Link, label: 'Ссылка', icon: Link },
];
