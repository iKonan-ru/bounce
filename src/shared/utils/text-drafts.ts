// Недописанные тексты на устройстве (localStorage): черновик новой заметки и правка текста
// песни. Явный выход ("Выйти") их стирает, как и очередь заметок (entities/note/store/outbox.ts): следующим на
// этом устройстве может войти другой человек. Потерянная сессия - нет: тот же человек войдёт
// снова и допишет.
import { DRAFT_PREFIXES } from '../constants/text-drafts';

/** Ключ черновика текста */
function checkIsDraftKey(key: string | null): key is string {
  if (key === null) {
    return false;
  }

  return DRAFT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Стирает все черновики текстов на устройстве */
export function clearTextDrafts(): void {
  try {
    const draftKeys = Array.from(
      { length: localStorage.length },
      (_value, index) => localStorage.key(index)
    ).filter(checkIsDraftKey);
    for (const key of draftKeys) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    // без хранилища черновиков и нет
    console.error(error);
  }
}
