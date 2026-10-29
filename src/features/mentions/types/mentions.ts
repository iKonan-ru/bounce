import type { CSSProperties, RefObject, ReactNode, KeyboardEvent } from 'react';
import type { User } from '@/entities/user';

/** Поле ввода, в котором работают упоминания */
export type MentionField = HTMLInputElement | HTMLTextAreaElement;

/** Место списка: в каком элементе он рисуется и где стоит */
export interface MenuPlace {
  host: Element;
  style: CSSProperties;
}

/** Параметры хука упоминаний */
export interface UseMentionsParams<T extends MentionField> {
  ref: RefObject<T | null>;
  /** Текст поля */
  value: string;
  setValue: (value: string) => void;
  /** Кого можно упомянуть */
  people: readonly User[];
}

/** Результат хука упоминаний */
export interface UseMentionsResult<T extends MentionField> {
  /** Список подходящих людей в портале; null - списка нет */
  menu: ReactNode;
  /** Клавиши списка; true - нажатие обработано */
  onKeyDown: (event: KeyboardEvent<T>) => boolean;
  /** Сверить список с курсором в поле */
  sync: () => void;
}

/** Результат хука места списка */
export interface UseMenuPlaceResult {
  /** Место списка; null - списка не видно */
  place: MenuPlace | null;
}
