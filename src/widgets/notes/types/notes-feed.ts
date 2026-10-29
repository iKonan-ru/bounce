import type { Note, PendingNote } from '@/entities/note';
import type { NoteScope } from '@/shared/types';

/** Пропсы ленты заметок */
export interface NotesFeedProps {
  scope: NoteScope;
}

/** Пропсы списка заметок */
export interface NoteListProps {
  projectId: string;
  notes: readonly Note[];
  pending?: readonly PendingNote[];
  /** Показывать у заметки, откуда она: проект, песня или этап */
  showOrigin?: boolean;
}
