import { useState } from 'react';

// Выбор, который помнит это устройство (вид плана, размер шрифта текста, боковая панель), -
// в localStorage. Без хранилища (запрет, приватный режим) выбор держится до перезагрузки.

// parse получает сохранённую строку (null - ничего не сохранено); fallback - если хранилище
// недоступно
export function readChoice<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return fallback;
  }
}

export function writeChoice(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // без хранилища выбор держится до перезагрузки
  }
}

// состояние, которое читается из хранилища при первом показе и записывается при каждой смене
export function useStoredChoice<T>(
  key: string,
  parse: (raw: string | null) => T,
  fallback: T,
  serialize: (value: T) => string = String,
): [T, (value: T) => void] {
  const [value, setValue] = useState(() => readChoice(key, parse, fallback));
  return [
    value,
    (next) => {
      setValue(next);
      writeChoice(key, serialize(next));
    },
  ];
}
