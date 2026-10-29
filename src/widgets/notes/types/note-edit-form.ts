import type {
  RefObject,
  ReactNode,
  ComponentProps,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
  FormEvent,
} from 'react';
import type { Note } from '@/entities/note';
import type { MarkupToolbar } from '@/features/markup';

/** Пропсы формы правки заметки */
export interface NoteEditFormProps {
  note: Note;
  /** Правка закончена: сохранили, отменили или текст не поменялся */
  onDone: () => void;
}

/** Состояние и обработчики формы правки заметки */
export interface UseNoteEditFormResult {
  editRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  textareaId: string;
  isBusy: boolean;
  isSaveDisabled: boolean;
  /** Список упоминаний под полем */
  mentionsMenu: ReactNode;
  onMarkupAction: ComponentProps<typeof MarkupToolbar>['onAction'];
  onDraftSelect: () => void;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onDraftPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
