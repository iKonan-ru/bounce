import type { ReactNode } from 'react';
import { useAccess } from '@/entities/project';
import { GROUP_ROWS } from '@/shared/constants';
import { useMe } from '@/shared/hooks';
import type { NoteListProps } from '../types/notes-feed';
import { NoteItem } from './note-item';
import { PendingItem } from './pending-item';

/**
 * Список заметок: сначала ждущие отправки, потом отправленные
 *
 * Права и текущий пользователь - один раз на весь список, а не в каждой заметке: в разделе
 * "Все заметки" их сотни
 */
export function NoteList({
  projectId,
  notes,
  pending = [],
  showOrigin = false,
}: NoteListProps): ReactNode {
  const access = useAccess(projectId);
  const me = useMe();
  const meId = me?.id;
  const isEmpty = notes.length === 0 && pending.length === 0;

  if (isEmpty) {
    return null;
  }

  return (
    <ul className={GROUP_ROWS}>
      {pending.map((pendingNote) => (
        <li key={pendingNote.id} className="animate-enter">
          <PendingItem note={pendingNote} />
        </li>
      ))}
      {notes.map((note) => (
        <li key={note.id} className="animate-enter">
          <NoteItem
            note={note}
            showOrigin={showOrigin}
            access={access}
            meId={meId}
          />
        </li>
      ))}
    </ul>
  );
}
