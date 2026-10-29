import type {
  RefObject,
  ReactNode,
  FormEvent,
  FocusEvent,
  ChangeEvent,
  KeyboardEvent,
} from 'react';

/** Пропсы текста, который правится на месте */
export interface InlineTitleProps {
  value: string;
  /** Новый текст без пробелов по краям */
  onSave: (value: string) => void;
  /** Подпись поля и карандаша для экранного диктора */
  label: string;
  maxLength?: number;
  /** Карандаш рядом с текстом; без него правка - только по нажатию на текст */
  showPencil?: boolean;
  /** Упоминания людей этого проекта через @ (в поле - список, в тексте - имена) */
  mentionProjectId?: string | undefined;
  className?: string;
}

/** Состояние и действия текста, который правится на месте */
export interface UseInlineTitleResult {
  isEditing: boolean;
  /** Набранное в поле */
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onEditClick: () => void;
  onSubmit: (event: FormEvent) => void;
  onInputFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputSelect: () => void;
  onInputBlur: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}
