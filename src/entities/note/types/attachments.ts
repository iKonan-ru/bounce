import type { ReactNode } from 'react';
import type { AudioView } from './notes';

/** Вложение в списке: ключ и что показать */
export interface Attachment {
  key: string;
  content: ReactNode;
}

/** Открытие картинки на весь экран */
export interface PictureOpen {
  /** Подпись кнопки для экранного диктора */
  label: string;
  onClick: () => void;
}

/** Картинка во вложениях */
export interface Picture extends Attachment {
  /** Картинка с сервера открывается на весь экран; файл на устройстве - только превью */
  open?: PictureOpen;
}

/** Пропсы превью локальной картинки */
export interface LocalImageProps {
  file: File;
}

/** Пропсы ячейки картинки */
export interface PictureCellProps {
  picture: Picture;
}

/** Пропсы вложений заметки */
export interface NoteAttachmentsProps {
  images: readonly Picture[];
  audio: readonly Attachment[];
  audioView: AudioView;
  /** Отступ слева: у отправленной заметки блоки стоят под текстом, правее аватара */
  className?: string | undefined;
}

/** Что показать во вложениях заметки */
export interface UseNoteAttachmentsResult {
  hasImages: boolean;
  hasAudio: boolean;
  imagesClassName: string;
  audioClassName: string;
  /** Классы аудио в списке: у имён файлов - плашка, у плееров - нет */
  audioItemClassName: string | undefined;
}
