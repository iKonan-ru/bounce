import { useQuery } from '@tanstack/react-query';
import { NoteComposer } from '@/components/notes/note-composer';
import { NoteItem } from '@/components/notes/note-item';
import { PendingItem } from '@/components/notes/pending-item';
import { GROUP_ROWS } from '@/components/page';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import type { Note } from '@/lib/model';
import type { NoteScope } from '@/lib/notes';
import { useOnline } from '@/lib/offline';
import { type PendingNote, usePendingNotes } from '@/lib/outbox';
import { notesQuery } from '@/lib/queries';

// Заметки одного уровня - проекта, песни или этапа: форма добавления и список.
export function NotesFeed({ scope }: { scope: NoteScope }) {
  const notes = useQuery(notesQuery(scope));
  const pending = usePendingNotes(scope);
  const access = useAccess(scope.project);
  const online = useOnline();
  return (
    <div className="flex flex-col gap-3">
      {access.work && <NoteComposer scope={scope} />}
      {notes.isError && !notes.data && (
        <p className="px-1 text-sm text-led-red">Заметки не загрузились.</p>
      )}
      {notes.isPending && !online && (
        <p className="px-1 text-sm text-dim">Нет сети: заметки появятся, когда связь вернётся.</p>
      )}
      <NoteList projectId={scope.project} notes={notes.data ?? []} pending={pending} />
      {!access.work && notes.data?.length === 0 && (
        <p className="px-1 text-sm text-dim">Заметок нет</p>
      )}
    </div>
  );
}

// Права и текущий пользователь - один раз на весь список, а не в каждой заметке: в разделе
// "Все заметки" их сотни.
export function NoteList({
  projectId,
  notes,
  pending = [],
  showOrigin,
}: {
  projectId: string;
  notes: ReadonlyArray<Note>;
  pending?: ReadonlyArray<PendingNote>;
  showOrigin?: boolean;
}) {
  const access = useAccess(projectId);
  const me = useMe();
  if (notes.length === 0 && pending.length === 0) return null;
  return (
    <ul className={GROUP_ROWS}>
      {pending.map((p) => (
        <li key={p.id} className="animate-enter">
          <PendingItem note={p} />
        </li>
      ))}
      {notes.map((n) => (
        <li key={n.id} className="animate-enter">
          <NoteItem note={n} showOrigin={showOrigin ?? false} access={access} meId={me?.id} />
        </li>
      ))}
    </ul>
  );
}
