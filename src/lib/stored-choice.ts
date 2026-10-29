import { useState } from 'react';

// Выбор, который помнит это устройство (вид плана, размер шрифта текста, боковая панель), -
// в localStorage. Без хранилища (запрет, приватный режим) выбор держится до перезагрузки.

/** Прочитать выбор: parse получает сохранённую строку (null - ничего не сохранено); fallback - если хранилище недоступно */
export function readChoice<Value>(
  key: string,
  parse: (raw: string | null) => Value,
  fallback: Value
): Value {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

/** Запомнить выбор на устройстве */
export function writeChoice(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // без хранилища выбор держится до перезагрузки
    console.error(error);
  }
}

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
