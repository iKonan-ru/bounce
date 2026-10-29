import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// отметка "сделано" сначала видна (зачёркивание), а пункт уходит из списка чуть позже
const LEAVE_MS = 450;

// круглая отметка "сделано": сначала зачёркивание, через мгновение пункт уходит
export function DoneCheck({
  checked,
  label,
  disabled,
  onDone,
  className,
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onDone: (done: boolean) => void;
  className?: string;
}) {
  return (
    // зона нажатия больше самой отметки: у Checkbox есть невидимое поле вокруг (after:)
    <span className={cn('-m-2 flex size-10 shrink-0 items-center justify-center', className)}>
      <Checkbox
        aria-label={label}
        disabled={disabled}
        className="size-5 rounded-full disabled:opacity-100"
        checked={checked}
        onCheckedChange={(v) => onDone(v === true)}
      />
    </span>
  );
}

// Задержанное действие: пока пункт "уходит", отметка уже стоит. Если строка исчезла раньше
// (переключили "Все / Мои", ушли со страницы), действие выполняется сразу, а не теряется.
export function useLeaving(): [boolean, (run: () => void) => void] {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      pending.current?.();
    },
    [],
  );
  return [
    leaving,
    (run) => {
      setLeaving(true);
      pending.current = run;
      timer.current = setTimeout(() => {
        pending.current = null;
        run();
        setLeaving(false);
      }, LEAVE_MS);
    },
  ];
}
