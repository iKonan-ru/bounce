import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Вариант переключателя */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Пропсы переключателя */
interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для экранного диктора */
  label: string;
  /** Только смотреть (наблюдатель): выбранный вариант виден, переключить нельзя */
  disabled?: boolean;
  className?: string;
}

/** Пропсы кнопки варианта */
interface SegmentedButtonProps<T extends string> {
  option: SegmentedOption<T>;
  isSelected: boolean;
  onSelect: (value: T) => void;
}

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
    'h-9 min-w-0 flex-auto truncate rounded-lg px-2.5 text-sm whitespace-nowrap transition-colors',
    {
      'bg-groove font-medium text-ink': isSelected,
      'text-dim hover:text-ink disabled:hover:text-dim': !isSelected,
    },
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
  const fieldsetClassName = cn('flex min-w-0 gap-1 rounded-xl bg-panel p-1', className);
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
