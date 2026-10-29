import type { FormEvent, ChangeEvent } from 'react';
import type { Note } from '@/entities/note';

/** Пропсы окна "Сделать песней" */
export interface MakeSongDialogProps {
  note: Note;
  onClose: () => void;
}

/** Состояние и обработчики окна "Сделать песней" */
export interface UseMakeSongDialogResult {
  songTitle: string;
  inputId: string;
  isBusy: boolean;
  isCreateDisabled: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}
