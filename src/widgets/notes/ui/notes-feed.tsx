import type { ReactNode } from 'react';
import { notesQuery, usePendingNotes } from '@/entities/note';
import { useAccess } from '@/entities/project';
import { useIsOnline } from '@/shared/hooks';
import { useQuery } from '@tanstack/react-query';
import type { NotesFeedProps } from '../types/notes-feed';
import { NoteComposer } from './note-composer';
import { NoteList } from './note-list';

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
