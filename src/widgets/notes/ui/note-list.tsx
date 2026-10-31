import type { ReactNode } from 'react';
import { useAccess } from '@/entities/project';
import { GROUP_ROWS } from '@/shared/constants';
import { useMe } from '@/shared/hooks';
import type { NoteItemProps } from '../types/note-item';
import type { NoteListProps } from '../types/notes-feed';
import { NoteItem } from './note-item';
import { PendingItem } from './pending-item';

/**
 * Список заметок: сначала ждущие отправки, потом отправленные
 *
 * В проектной ленте права общие; в смешанной определяются по проекту каждой заметки.
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
          {projectId === note.project ? (
            <NoteItem
              note={note}
              showOrigin={showOrigin}
              access={access}
              meId={meId}
            />
          ) : (
            <ScopedNoteItem note={note} showOrigin={showOrigin} meId={meId} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Права заметки из другого проекта в общем списке */
function ScopedNoteItem(props: Omit<NoteItemProps, 'access'>): ReactNode {
  const access = useAccess(props.note.project);

  return <NoteItem {...props} access={access} />;
}
