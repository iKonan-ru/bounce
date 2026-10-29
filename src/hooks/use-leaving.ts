import { useEffect, useRef, useState } from 'react';

/** Через столько миллисекунд отмеченный пункт уходит из списка: сначала видно зачёркивание */
const LEAVE_MS = 450;

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
