import type { ReactNode } from 'react';
import { useAccess } from '@/lib/access';
import type { Note } from '@/lib/model';
import type { PendingNote } from '@/lib/outbox';
import { usePendingNotes } from '@/lib/outbox';
import { notesQuery } from '@/lib/queries';
import { GROUP_ROWS } from '@/shared/constants';
import { useIsOnline, useMe } from '@/shared/hooks';
import type { NoteScope } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';
import { NoteComposer } from './note-composer';
import { NoteItem } from './note-item';
import { PendingItem } from './pending-item';

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
