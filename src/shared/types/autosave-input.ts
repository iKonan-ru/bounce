import type { ChangeEvent, KeyboardEvent } from 'react';

/** Пропсы поля с автосохранением */
export interface AutosaveInputProps {
  id?: string;
  /** Значение с сервера */
  value: string;
  /** Новое значение после normalize */
  onSave: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  /** Приведение набранного к сохраняемому виду; по умолчанию - без пробелов по краям */
  normalize?: (value: string) => string;
  /** Что можно набрать: лишние символы отбрасываются сразу при вводе */
  filter?: (value: string) => string;
  /** Проверка значения: неверное не сохраняется */
  validate?: (value: string) => boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Параметры поля с автосохранением: значения по умолчанию уже подставлены */
export interface UseAutosaveInputParams extends Pick<
  AutosaveInputProps,
  'value' | 'onSave'
> {
  normalize: (value: string) => string;
  filter: ((value: string) => string) | undefined;
  validate: (value: string) => boolean;
  required: boolean | undefined;
}

/** Состояние и действия поля с автосохранением */
export interface UseAutosaveInputResult {
  /** Что сейчас в поле */
  draft: string;
  isValid: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}
