import type {
  RefObject,
  ReactNode,
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
} from 'react';

/** Пропсы строки "+ Добавить ..." */
export interface AddRowProps {
  id: string;
  label: string;
  onAdd: (title: string) => Promise<unknown> | void;
  isBusy?: boolean | undefined;
  maxLength?: number;
  /** Упоминания людей этого проекта через @ */
  mentionProjectId?: string | undefined;
  className?: string;
}

/** Состояние и обработчики строки "+ Добавить ..." */
export interface UseAddRowResult {
  /** Строка развёрнута в поле */
  isOpen: boolean;
  title: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isAddDisabled: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onOpenClick: () => void;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTitleSelect: () => void;
  onTitleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTitleBlur: () => void;
}
