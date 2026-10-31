import { readChoice, writeChoice } from '@/shared/utils';

/** Последний раздел заметок на телефоне: пустая строка означает личные */
export function getRememberedNotesProject(userId: string): string {
  return readChoice(
    `bounce.mobile-notes.${userId}`,
    (value) => value ?? '',
    ''
  );
}

/** Выбор сохраняется отдельно для каждого пользователя */
export function rememberNotesProject(userId: string, projectId: string): void {
  writeChoice(`bounce.mobile-notes.${userId}`, projectId);
}
