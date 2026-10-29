import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import type { DoneCheckProps } from '../types/done-check';
import { cn } from '../utils/cn';
import { Checkbox } from './kit/checkbox';

/** Круглая отметка "сделано": сначала зачёркивание, через мгновение пункт уходит */
export function DoneCheck({
  checked,
  label,
  disabled,
  onDone,
  className,
}: DoneCheckProps): ReactNode {
  const wrapperClassName = cn(
    '-m-2 flex size-10 shrink-0 items-center justify-center',
    className
  );
  const onCheckedChange = (state: CheckboxPrimitive.CheckedState): void => {
    onDone(state === true);
  };

  return (
    // зона нажатия больше самой отметки: у Checkbox есть невидимое поле вокруг (after:)
    <span className={wrapperClassName}>
      <Checkbox
        aria-label={label}
        disabled={disabled}
        className="size-5 rounded-full disabled:opacity-100"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </span>
  );
}
