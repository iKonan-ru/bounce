import type { CSSProperties } from 'react';
import type { Person } from '@/shared/types';

/** Пропсы строки списка упоминаний */
export interface MentionOptionProps {
  person: Person;
  index: number;
  optionId: string;
  isActive: boolean;
  onActivate: (index: number) => void;
  onPick: (person: Person) => void;
}

/** Пропсы списка упоминаний */
export interface MentionMenuProps {
  /** id списка: из него и номера строки складываются id строк */
  listId: string;
  style: CSSProperties | undefined;
  people: readonly Person[];
  /** Номер выбранной строки */
  activeIndex: number;
  onActivate: (index: number) => void;
  onPick: (person: Person) => void;
}
