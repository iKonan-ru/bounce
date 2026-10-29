import type { ReactNode } from 'react';
import { NoteComposer } from '@/components/notes/note-composer';
import { NoteItem } from '@/components/notes/note-item';
import { PendingItem } from '@/components/notes/pending-item';
import { GROUP_ROWS } from '@/components/page';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import type { Note } from '@/lib/model';
import type { NoteScope } from '@/lib/notes';
import { useIsOnline } from '@/lib/offline';
import { type PendingNote, usePendingNotes } from '@/lib/outbox';
import { notesQuery } from '@/lib/queries';
import { useQuery } from '@tanstack/react-query';

/** Пропсы ленты заметок */
interface NotesFeedProps {
  scope: NoteScope;
}

/** Заметки одного уровня - проекта, песни или этапа: форма добавления и список */
export function NotesFeed({ scope }: NotesFeedProps): ReactNode {
  const notes = useQuery(notesQuery(scope));
  const pending = usePendingNotes(scope);
  const access = useAccess(scope.project);
  const isOnline = useIsOnline();
  const hasLoadError = notes.isError && !notes.data;
  const isWaitingForNetwork = notes.isPending && !isOnline;
  const noteList = notes.data ?? [];
  const isLoadedEmpty = notes.data?.length === 0;
  const showEmpty = !access.canWork && isLoadedEmpty;

  return (
    <div className="flex flex-col gap-3">
      {access.canWork && <NoteComposer scope={scope} />}
      {hasLoadError && (
        <p className="px-1 text-sm text-led-red">Заметки не загрузились.</p>
      )}
      {isWaitingForNetwork && (
        <p className="px-1 text-sm text-dim">
          Нет сети: заметки появятся, когда связь вернётся.
        </p>
      )}
      <NoteList projectId={scope.project} notes={noteList} pending={pending} />
      {showEmpty && <p className="px-1 text-sm text-dim">Заметок нет</p>}
    </div>
  );
}

/** Пропсы списка заметок */
interface NoteListProps {
  projectId: string;
  notes: readonly Note[];
  pending?: readonly PendingNote[];
  /** Показывать у заметки, откуда она: проект, песня или этап */
  showOrigin?: boolean;
}

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
