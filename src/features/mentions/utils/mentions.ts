import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '@/entities/user';
import type { MentionQuery, Person } from '@/shared/types';
import { getMatchingPeople } from '@/shared/utils';
import {
  DIALOG_SELECTOR,
  MENU_GAP_PX,
  MENU_MIN_LEFT_PX,
} from '../constants/mentions';
import type { MentionField, MenuPlace } from '../types/mentions';

/** Набираемое упоминание то же: то же начало и тот же запрос */
export function checkIsSameQuery(
  first: MentionQuery | null,
  second: MentionQuery | null
): boolean {
  const isSameStart = first?.start === second?.start;
  const isSameQuery = first?.query === second?.query;

  return isSameStart && isSameQuery;
}

/** Подходящие люди для набираемого упоминания; без упоминания - никого */
export function getSuggestedPeople(
  people: readonly User[],
  query: MentionQuery | null
): Person[] {
  if (!query) {
    return [];
  }

  return getMatchingPeople(people, query.query);
}

/** Место списка под полем, у левого края: в окне - внутри окна, иначе - в body */
export function getMenuPlace(field: MentionField): MenuPlace {
  const fieldRect = field.getBoundingClientRect();
  const dialog = field.closest(DIALOG_SELECTOR);

  if (!dialog) {
    return {
      host: document.body,
      style: {
        position: 'fixed',
        top: fieldRect.bottom + MENU_GAP_PX,
        left: Math.max(MENU_MIN_LEFT_PX, fieldRect.left),
      },
    };
  }

  const dialogRect = dialog.getBoundingClientRect();

  return {
    host: dialog,
    style: {
      position: 'absolute',
      top: fieldRect.bottom - dialogRect.top + dialog.scrollTop + MENU_GAP_PX,
      left: Math.max(MENU_MIN_LEFT_PX, fieldRect.left - dialogRect.left),
    },
  };
}

/** Список в портале, когда он открыт и его место известно */
export function getMenuPortal(
  list: ReactNode,
  place: MenuPlace | null,
  isOpen: boolean
): ReactNode {
  if (!place) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(list, place.host);
}
