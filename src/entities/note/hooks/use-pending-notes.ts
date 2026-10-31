import { useSyncExternalStore } from 'react';
import type { NoteScope } from '@/shared/types';
import {
  subscribe,
  pendingNotes,
  getCurrentUserId,
  checkIsSameScope,
} from '../store/outbox';
import type { PendingNote } from '../types/outbox';

/** Свои заметки в очереди для этой ленты */
export function usePendingNotes(
  scope: NoteScope,
  includeNested = false
): PendingNote[] {
  const allPending = useSyncExternalStore(
    subscribe,
    () => pendingNotes,
    () => pendingNotes
  );
  const userId = getCurrentUserId();

  return allPending.filter(
    (note) =>
      note.author === userId &&
      (includeNested
        ? note.scope.project === scope.project
        : checkIsSameScope(note.scope, scope))
  );
}
