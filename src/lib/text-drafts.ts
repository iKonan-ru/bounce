// Недописанные тексты на устройстве (localStorage): черновик новой заметки и правка текста
// песни. Явный выход ("Выйти") их стирает, как и очередь заметок (lib/outbox.ts): следующим на
// этом устройстве может войти другой человек. Потерянная сессия - нет: тот же человек войдёт
// снова и допишет.

export const NOTE_DRAFT_PREFIX = 'bounce.draft.';
export const LYRICS_DRAFT_PREFIX = 'bounce.lyrics-draft.';

export function clearTextDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(NOTE_DRAFT_PREFIX) || key?.startsWith(LYRICS_DRAFT_PREFIX)) {
        keys.push(key);
      }
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // без хранилища черновиков и нет
  }
}
