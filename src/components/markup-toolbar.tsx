import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
  Strikethrough,
  TextQuote,
  Underline,
} from 'lucide-react';
import type { ClipboardEvent, KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react';
import { BlockKind, getSafeUrl, InlineKind } from '@/lib/markup';
import { cn } from '@/lib/utils';

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
interface TextEdit {
  /** Текст поля */
  value: string;
  /** Начало выделения */
  start: number;
  /** Конец выделения */
  end: number;
}

/** Описание кнопки панели оформления */
interface MarkupButton {
  action: MarkupAction;
  label: string;
  icon: LucideIcon;
}

/** Результат хука правки разметки */
interface UseMarkupEditingResult {
  /** Применить действие панели к выделению */
  onAction: (action: MarkupAction) => void;
  /** Сочетания клавиш; true - нажатие обработано */
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Вставка адреса поверх выделения; true - вставка обработана */
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => boolean;
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

/** Формат текста в буфере обмена */
const CLIPBOARD_TEXT_FORMAT = 'text';

/** Действия по сочетанию Cmd/Ctrl + клавиша; в русской раскладке - те же клавиши */
const SHORTCUT_ACTIONS: Record<string, MarkupAction> = {
  b: InlineKind.Bold,
  i: InlineKind.Italic,
  u: InlineKind.Underline,
  k: InlineKind.Link,
  и: InlineKind.Bold,
  ш: InlineKind.Italic,
  г: InlineKind.Underline,
  л: InlineKind.Link,
};

/** Кнопки панели оформления по порядку */
const MARKUP_BUTTONS: readonly MarkupButton[] = [
  { action: InlineKind.Bold, label: 'Жирный', icon: Bold },
  { action: InlineKind.Italic, label: 'Курсив', icon: Italic },
  { action: InlineKind.Underline, label: 'Подчёркнутый', icon: Underline },
  { action: InlineKind.Strike, label: 'Зачёркнутый', icon: Strikethrough },
  { action: BlockKind.List, label: 'Список', icon: List },
  { action: BlockKind.OrderedList, label: 'Нумерованный список', icon: ListOrdered },
  { action: BlockKind.Quote, label: 'Цитата', icon: TextQuote },
  { action: InlineKind.Code, label: 'Моноширинный', icon: Code },
  { action: InlineKind.Link, label: 'Ссылка', icon: Link },
];

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
      value: before.slice(0, -marker.length) + selection + after.slice(marker.length),
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
function insertLink(edit: TextEdit, url?: string): TextEdit {
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
function applyAction(edit: TextEdit, action: MarkupAction): TextEdit {
  const marker = WRAP_MARKER[action];
  if (marker) {
    return wrapSelection(edit, marker);
  }
  if (checkIsLineBlockKind(action)) {
    return toggleLinePrefix(edit, action);
  }
  return insertLink(edit);
}

/**
 * Правка разметки в поле: кнопки панели, сочетания клавиш (Cmd/Ctrl + B, I, U, K), вставка
 * адреса поверх выделения делает из него ссылку
 */
export function useMarkupEditing(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (value: string) => void,
): UseMarkupEditingResult {
  function handleEdit(change: (edit: TextEdit) => TextEdit): void {
    const field = ref.current;
    if (!field) {
      return;
    }
    const next = change({ value, start: field.selectionStart, end: field.selectionEnd });
    setValue(next.value);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  }

  const onAction = (action: MarkupAction): void => {
    handleEdit((edit) => applyAction(edit, action));
  };

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    const hasModifier = event.metaKey || event.ctrlKey;
    const isShortcut = hasModifier && !event.altKey;
    if (!isShortcut) {
      return false;
    }
    const key = event.key.toLowerCase();
    const action = SHORTCUT_ACTIONS[key];
    if (!action) {
      return false;
    }
    event.preventDefault();
    onAction(action);
    return true;
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>): boolean {
    const field = ref.current;
    if (!field) {
      return false;
    }
    const hasSelection = field.selectionStart !== field.selectionEnd;
    if (!hasSelection) {
      return false;
    }
    const url = getSafeUrl(event.clipboardData.getData(CLIPBOARD_TEXT_FORMAT).trim());
    if (!url) {
      return false;
    }
    event.preventDefault();
    handleEdit((edit) => insertLink(edit, url));
    return true;
  }

  return { onAction, onKeyDown, onPaste };
}

/** Пропсы кнопки панели оформления */
interface MarkupToolbarButtonProps {
  button: MarkupButton;
  disabled: boolean | undefined;
  onAction: (action: MarkupAction) => void;
}

/** Кнопка панели оформления */
function MarkupToolbarButton({ button, disabled, onAction }: MarkupToolbarButtonProps): ReactNode {
  const ButtonIcon = button.icon;
  // нажатие не уводит фокус из поля: выделение остаётся
  const onButtonMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  };
  const onButtonClick = (): void => {
    onAction(button.action);
  };
  return (
    <button
      type="button"
      title={button.label}
      aria-label={button.label}
      disabled={disabled}
      onMouseDown={onButtonMouseDown}
      onClick={onButtonClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-dim transition-colors hover:bg-groove hover:text-ink disabled:opacity-40 md:size-8"
    >
      <ButtonIcon className="size-4" />
    </button>
  );
}

/** Пропсы панели оформления */
interface MarkupToolbarProps {
  onAction: (action: MarkupAction) => void;
  disabled?: boolean;
  className?: string;
}

/** Панель оформления текста над полем */
export function MarkupToolbar({ onAction, disabled, className }: MarkupToolbarProps): ReactNode {
  const toolbarClassName = cn(
    'flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]',
    className,
  );
  return (
    <div role="toolbar" aria-label="Оформление текста" className={toolbarClassName}>
      {MARKUP_BUTTONS.map((button) => (
        <MarkupToolbarButton
          key={button.action}
          button={button}
          disabled={disabled}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
