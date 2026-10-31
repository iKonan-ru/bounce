import type { ReactNode } from 'react';
import {
  SEGMENTED_GROUP,
  SEGMENTED_ITEM,
  SEGMENTED_ACTIVE,
} from '../constants/segmented';
import type { SegmentedButtonProps, SegmentedProps } from '../types/segmented';
import { cn } from '../utils/cn';

/** Кнопка одного варианта переключателя */
function SegmentedButton<T extends string>({
  option,
  isSelected,
  onSelect,
}: SegmentedButtonProps<T>): ReactNode {
  const onButtonClick = (): void => {
    onSelect(option.value);
  };
  const buttonClassName = cn(
    SEGMENTED_ITEM,
    'h-9 min-w-0 flex-auto truncate whitespace-nowrap',
    isSelected ? SEGMENTED_ACTIVE : 'text-dim'
  );

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onButtonClick}
      className={buttonClassName}
    >
      {option.label}
    </button>
  );
}

/** Переключатель из нескольких вариантов (вкладки на телефоне, статус песни) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: SegmentedProps<T>): ReactNode {
  const fieldsetClassName = cn(SEGMENTED_GROUP, 'flex min-w-0', className);

  return (
    <fieldset disabled={disabled} className={fieldsetClassName}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <SegmentedButton
            key={option.value}
            option={option}
            isSelected={isSelected}
            onSelect={onChange}
          />
        );
      })}
    </fieldset>
  );
}
