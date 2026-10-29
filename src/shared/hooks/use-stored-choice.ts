import { useState } from 'react';
import { readChoice, writeChoice } from '../utils/stored-choice';

/** Состояние, которое читается из хранилища при первом показе и записывается при каждой смене */
export function useStoredChoice<Value>(
  key: string,
  parse: (raw: string | null) => Value,
  fallback: Value,
  serialize: (value: Value) => string = String
): [Value, (value: Value) => void] {
  const [value, setValue] = useState(() => readChoice(key, parse, fallback));
  const setStoredValue = (next: Value): void => {
    setValue(next);
    writeChoice(key, serialize(next));
  };

  return [value, setStoredValue];
}
