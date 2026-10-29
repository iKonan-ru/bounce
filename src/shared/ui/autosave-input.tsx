import type { ReactNode } from 'react';
import { useAutosaveInput } from '../hooks/use-autosave-input';
import type { AutosaveInputProps } from '../types/autosave-input';
import { cn } from '../utils/cn';
import { Input } from './kit/input';

/** Значение без пробелов по краям */
function trimValue(value: string): string {
  return value.trim();
}

/** Любое значение подходит */
function acceptAnyValue(): boolean {
  return true;
}

/**
 * Поле без кнопки "Сохранить": значение уходит при уходе из поля или по Enter
 *
 * Пока поле не в фокусе, оно следует за сохранённым значением (правки соавтора приходят сами)
 */
export function AutosaveInput({
  id,
  value,
  onSave,
  placeholder,
  maxLength,
  inputMode,
  normalize = trimValue,
  filter,
  validate = acceptAnyValue,
  required,
  disabled,
  className,
}: AutosaveInputProps): ReactNode {
  const {
    draft,
    isValid,
    onInputChange,
    onInputFocus,
    onInputBlur,
    onInputKeyDown,
  } = useAutosaveInput({
    value,
    onSave,
    normalize,
    filter,
    validate,
    required,
  });
  const inputClassName = cn(
    'h-10 border-0 bg-transparent px-2 text-right shadow-none hover:bg-groove/40 focus-visible:bg-groove/40 focus-visible:ring-0 dark:bg-transparent md:h-9',
    className
  );

  return (
    <Input
      id={id}
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      aria-invalid={!isValid}
      onChange={onInputChange}
      onFocus={onInputFocus}
      onBlur={onInputBlur}
      onKeyDown={onInputKeyDown}
      className={inputClassName}
    />
  );
}
