import type { RefObject, KeyboardEvent, ClipboardEvent } from 'react';
import { getSafeUrl } from '@/shared/utils';
import {
  SHORTCUT_ACTIONS,
  CLIPBOARD_TEXT_FORMAT,
} from '../constants/markup-editing';
import type {
  UseMarkupEditingResult,
  TextEdit,
  MarkupAction,
} from '../types/markup-editing';
import { applyAction, insertLink } from '../utils/markup-editing';

/**
 * Правка разметки в поле: кнопки панели, сочетания клавиш (Cmd/Ctrl + B, I, U, K), вставка
 * адреса поверх выделения делает из него ссылку
 */
export function useMarkupEditing(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (value: string) => void
): UseMarkupEditingResult {
  /** Правка текста поля с выделением; после неё поле снова в фокусе с новым выделением */
  function handleEdit(change: (edit: TextEdit) => TextEdit): void {
    const field = ref.current;

    if (!field) {
      return;
    }

    const next = change({
      value,
      start: field.selectionStart,
      end: field.selectionEnd,
    });
    setValue(next.value);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  }

  const onAction = (action: MarkupAction): void => {
    handleEdit((edit) => applyAction(edit, action));
  };

  /** Сочетание клавиш оформления; true - нажатие обработано */
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

  /** Вставка адреса поверх выделения делает из него ссылку; true - вставка обработана */
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>): boolean {
    const field = ref.current;

    if (!field) {
      return false;
    }

    const hasSelection = field.selectionStart !== field.selectionEnd;

    if (!hasSelection) {
      return false;
    }

    const url = getSafeUrl(
      event.clipboardData.getData(CLIPBOARD_TEXT_FORMAT).trim()
    );

    if (!url) {
      return false;
    }

    event.preventDefault();
    handleEdit((edit) => insertLink(edit, url));

    return true;
  }

  return { onAction, onKeyDown, onPaste };
}
