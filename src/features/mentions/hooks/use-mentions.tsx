import type { KeyboardEvent } from 'react';
import { useState, useCallback, useEffect, useId } from 'react';
import type { MentionQuery, Person } from '@/shared/types';
import {
  getMentionQuery,
  getMentionOptionId,
  insertMention,
} from '@/shared/utils';
import type {
  MentionField,
  UseMentionsParams,
  UseMentionsResult,
} from '../types/mentions';
import { MentionMenu } from '../ui/mention-menu';
import {
  checkIsSameQuery,
  getSuggestedPeople,
  getMenuPortal,
} from '../utils/mentions';
import { useComboboxAttributes } from './use-combobox-attributes';
import { useMenuPlace } from './use-menu-place';

/**
 * Упоминания в поле ввода: после "@" под полем - список подходящих людей; стрелки, Enter или Tab -
 * выбрать, Escape - закрыть. В поле вставляется @логин, при показе текста - имя
 *
 * Список рисуется в портале под полем: в окне - внутри окна (иначе нажатие на него закрыло бы
 * окно), иначе - в body; так его не обрезают блоки со скруглёнными краями
 */
export function useMentions<T extends MentionField>({
  ref,
  value,
  setValue,
  people,
}: UseMentionsParams<T>): UseMentionsResult<T> {
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);

  // useCallback нужен для корректности: sync - зависимость эффекта ниже и эффектов в полях,
  // новая функция на каждой отрисовке перезапускала бы их
  const sync = useCallback((): void => {
    const field = ref.current;

    if (!field) {
      setMentionQuery(null);

      return;
    }

    if (document.activeElement !== field) {
      setMentionQuery(null);

      return;
    }

    const nextQuery = getMentionQuery(
      field.value,
      field.selectionStart ?? field.value.length
    );
    // закрытый Escape список не открывается снова, пока не начали новое упоминание
    const isClosedByEscape = nextQuery !== null && closedAt === nextQuery.start;

    if (isClosedByEscape) {
      setMentionQuery(null);

      return;
    }

    setMentionQuery((prev) => {
      if (checkIsSameQuery(prev, nextQuery)) {
        return prev;
      }

      return nextQuery;
    });
    setActiveIndex(0);
  }, [ref, closedAt]);

  // value меняется и когда текст вставили кнопками: сверяемся с курсором после отрисовки
  useEffect(() => {
    sync();
  }, [value, sync]);

  const suggestedPeople = getSuggestedPeople(people, mentionQuery);
  const isOpen = mentionQuery !== null && suggestedPeople.length > 0;

  const listId = useId();
  const activeOptionId = getMentionOptionId(listId, activeIndex);
  useComboboxAttributes(ref, isOpen, listId, activeOptionId);

  const { place } = useMenuPlace(ref, isOpen);

  const handlePersonPick = (person: Person): void => {
    const field = ref.current;

    if (!field) {
      return;
    }

    if (!mentionQuery) {
      return;
    }

    const caret = field.selectionStart ?? value.length;
    const next = insertMention(
      value,
      mentionQuery.start,
      caret,
      person.username
    );
    setValue(next.value);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.caret, next.caret);
    });
  };

  const onKeyDown = (event: KeyboardEvent<T>): boolean => {
    if (!isOpen) {
      return false;
    }

    const isArrowKey = event.key === 'ArrowDown' || event.key === 'ArrowUp';

    if (isArrowKey) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const count = suggestedPeople.length;
      setActiveIndex((prev) => (prev + direction + count) % count);

      return true;
    }

    const isPickKey = event.key === 'Enter' || event.key === 'Tab';

    if (isPickKey) {
      const person = suggestedPeople[activeIndex];

      if (!person) {
        return false;
      }

      event.preventDefault();
      handlePersonPick(person);

      return true;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setClosedAt(mentionQuery?.start ?? null);
      setMentionQuery(null);

      return true;
    }

    return false;
  };

  const list = (
    <MentionMenu
      listId={listId}
      style={place?.style}
      people={suggestedPeople}
      activeIndex={activeIndex}
      onActivate={setActiveIndex}
      onPick={handlePersonPick}
    />
  );
  const menu = getMenuPortal(list, place, isOpen);

  return { menu, onKeyDown, sync };
}
