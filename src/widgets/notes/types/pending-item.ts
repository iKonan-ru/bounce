import type { PendingNote, Picture, Attachment } from '@/entities/note';

/** Пропсы ждущей отправки заметки */
export interface PendingItemProps {
  note: PendingNote;
}

/** Состояние и обработчики ждущей отправки заметки */
export interface UsePendingItemResult {
  /** Открыто подтверждение удаления */
  isConfirming: boolean;
  setIsConfirming: (isConfirming: boolean) => void;
  statusIconClassName: string;
  statusClassName: string;
  statusText: string;
  images: Picture[];
  audio: Attachment[];
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}

/** Пропсы имени аудиофайла в очереди */
export interface PendingAudioNameProps {
  file: File;
}
