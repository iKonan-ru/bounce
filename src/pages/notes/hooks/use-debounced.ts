import { useState, useEffect } from 'react';

/** Значение, которое догоняет исходное через delayMs после последнего изменения */
export function useDebounced<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return settled;
}
