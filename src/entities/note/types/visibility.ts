import { NotesVisibilityOptions } from '@/shared/api';

/** Видимость заметки: общая, личная или адресная */
export const NoteVisibility = NotesVisibilityOptions;

export type NoteVisibility = NotesVisibilityOptions;

/** Настройки видимости, сохраняемые вместе с текстом */
export interface NoteSharing {
  visibility: NoteVisibility;
  recipients: string[];
}
