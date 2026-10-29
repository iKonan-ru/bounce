import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** Пропсы отметки "сделано" */
interface DoneCheckProps {
  checked: boolean;
  /** Подпись отметки для экранного диктора */
  label: string;
  disabled: boolean;
  /** Отметку поставили (true) или сняли (false) */
  onDone: (isDone: boolean) => void;
  className?: string;
}

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
