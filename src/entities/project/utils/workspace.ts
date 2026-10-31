import { readChoice, writeChoice } from '@/shared/utils';

/** Общее личное пространство или проект для мобильных плана и заметок */
export function getRememberedWorkspace(userId: string): string {
  const previous = readChoice(
    `bounce.mobile-notes.${userId}`,
    (value) => value ?? '',
    ''
  );

  return readChoice(
    `bounce.workspace.${userId}`,
    (value) => value ?? previous,
    ''
  );
}

/** Выбор пользователя; пустой id означает личное пространство */
export function rememberWorkspace(userId: string, projectId: string): void {
  writeChoice(`bounce.workspace.${userId}`, projectId);
}
