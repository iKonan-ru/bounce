import { useState, useRef, useEffect } from 'react';
import { LEAVE_MS } from '../constants/leaving';
import type { UseLeavingResult } from '../types/leaving';

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
