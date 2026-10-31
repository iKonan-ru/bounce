import type { NoteSharing, NoteVisibility } from '@/entities/note';
import type { User } from '@/entities/user';

/** Выбор видимости для черновика или готовой заметки */
export interface NoteVisibilityMenuProps {
  projectId: string;
  authorId: string;
  value: NoteSharing;
  onSave: (value: NoteSharing) => void;
  isBusy?: boolean;
}

/** Состояние выбора получателей */
export interface UseNoteVisibilityResult {
  visibility: NoteVisibility;
  isSelected: boolean;
  people: User[];
  recipients: string[];
  isSaveDisabled: boolean;
  onVisibilityChange: (value: string) => void;
  onToggle: (id: string) => void;
  onSave: () => void;
}
