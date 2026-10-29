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
