import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** Через столько миллисекунд отмеченный пункт уходит из списка: сначала видно зачёркивание */
const LEAVE_MS = 450;

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

/** Задержанное действие пункта, который уходит из списка */
export interface UseLeavingResult {
  /** Пункт уходит: отметка уже стоит, действие ещё ждёт */
  isLeaving: boolean;
  /** Выполнить действие, когда пункт уйдёт */
  leave: (run: () => void) => void;
}

/**
 * Задержанное действие: пока пункт "уходит", отметка уже стоит
 *
 * Если строка исчезла раньше (переключили "Все / Мои", ушли со страницы), действие выполняется
 * сразу, а не теряется
 */
export function useLeaving(): UseLeavingResult {
  const [isLeaving, setIsLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRun = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);

      if (pendingRun.current) {
        pendingRun.current();
      }
    },
    []
  );
  const leave = (run: () => void): void => {
    setIsLeaving(true);
    pendingRun.current = run;
    timer.current = setTimeout(() => {
      pendingRun.current = null;
      run();
      setIsLeaving(false);
    }, LEAVE_MS);
  };

  return { isLeaving, leave };
}
