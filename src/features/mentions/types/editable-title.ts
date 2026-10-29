import type { RefObject, ReactNode, ChangeEvent, KeyboardEvent } from 'react';

/** Пропсы названия в шапке окна */
export interface EditableTitleProps {
  id: string;
  /** Подпись поля для экранного диктора */
  label: string;
  /** Название с сервера */
  value: string;
  projectId: string;
  disabled: boolean;
  /** Новое название без пробелов по краям */
  onCommit: (title: string) => void;
}

/** Состояние и действия названия в шапке окна */
export interface UseEditableTitleResult {
  /** Набранное в поле */
  title: string;
  isEditing: boolean;
  titleRef: RefObject<HTMLTextAreaElement | null>;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onTitleClick: () => void;
  onTitleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTitleSelect: () => void;
  onTitleFocus: () => void;
  onTitleBlur: () => void;
  onTitleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}
