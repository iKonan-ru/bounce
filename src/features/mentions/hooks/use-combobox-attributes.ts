import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { MentionField } from '../types/mentions';

/**
 * Для экранного диктора поле - выпадающий список (ARIA combobox): фокус остаётся в поле,
 * выбранный человек объявляется через aria-activedescendant
 *
 * Атрибуты ставятся здесь, а не в каждом поле с упоминаниями. Многострочное поле остаётся полем:
 * combobox бывает однострочным
 */
export function useComboboxAttributes(
  ref: RefObject<MentionField | null>,
  isOpen: boolean,
  listId: string,
  activeOptionId: string
): void {
  useEffect(() => {
    const field = ref.current;

    if (!field) {
      return;
    }

    if (field instanceof HTMLInputElement) {
      field.setAttribute('role', 'combobox');
      field.setAttribute('aria-expanded', String(isOpen));
    }

    field.setAttribute('aria-autocomplete', 'list');

    if (!isOpen) {
      field.removeAttribute('aria-controls');
      field.removeAttribute('aria-activedescendant');

      return;
    }

    field.setAttribute('aria-controls', listId);
    field.setAttribute('aria-activedescendant', activeOptionId);
  });
}
