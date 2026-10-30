import type { NoteSharing, NoteVisibility } from '@/entities/note';
import type { User } from '@/entities/user';

/** Выбор видимости для черновика или готовой заметки */
export interface NoteVisibilityDialogProps {
  projectId: string;
  authorId: string;
  value: NoteSharing;
  onSave: (value: NoteSharing) => void;
  onClose: () => void;
  isBusy?: boolean;
}

/** Состояние диалога видимости */
export interface UseNoteVisibilityResult {
  visibility: NoteVisibility;
  people: User[];
  recipients: string[];
  isSelected: boolean;
  isSaveDisabled: boolean;
  onVisibilityChange: (value: string) => void;
  onToggle: (id: string) => void;
  onSave: () => void;
}

/** Строка выбора получателя */
export interface RecipientProps {
  isBusy: boolean | undefined;
  user: User;
  recipients: readonly string[];
  onToggle: (id: string) => void;
}
