import type { RefObject, ReactNode, ChangeEvent, KeyboardEvent } from 'react';

/** Пропсы строки добавления */
export interface TitleComposerProps {
  id: string;
  /** Подпись и подсказка в пустом поле */
  label: string;
  value: string;
  onChange: (value: string) => void;
  projectId: string;
  isBusy: boolean;
  /** Поле - тому, кто возвращает в него фокус */
  inputRef?: RefObject<HTMLInputElement | null> | undefined;
}

/** Состояние и обработчики строки добавления */
export interface UseTitleComposerResult {
  fieldRef: RefObject<HTMLInputElement | null>;
  /** Есть что добавлять: видна кнопка "Добавить" */
  hasValue: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueSelect: () => void;
  onValueKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}
