import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { IMAGE_CELL_CLASS } from '../constants/attachments';
import { useNoteAttachments } from '../hooks/use-note-attachments';
import type {
  PictureCellProps,
  NoteAttachmentsProps,
} from '../types/attachments';

/** Ячейка картинки: с сервера - кнопка открытия на весь экран, с устройства - только превью */
function PictureCell({ picture }: PictureCellProps): ReactNode {
  const { open } = picture;

  if (!open) {
    return <div className={IMAGE_CELL_CLASS}>{picture.content}</div>;
  }

  const buttonClassName = cn('block', IMAGE_CELL_CLASS);

  return (
    <button
      type="button"
      onClick={open.onClick}
      aria-label={open.label}
      className={buttonClassName}
    >
      {picture.content}
    </button>
  );
}

/**
 * Вложения заметки под текстом: сетка картинок и список аудио - одинаково у отправленной заметки
 * и у ждущей отправки
 *
 * Аудио отправленной - плееры столбиком, ждущей - имена файлов в строку
 */
export function NoteAttachments({
  images,
  audio,
  audioView,
  className,
}: NoteAttachmentsProps): ReactNode {
  const {
    hasImages,
    hasAudio,
    imagesClassName,
    audioClassName,
    audioItemClassName,
  } = useNoteAttachments({ images, audio, audioView, className });

  return (
    <>
      {hasImages && (
        <div className={imagesClassName}>
          {images.map((picture) => (
            <PictureCell key={picture.key} picture={picture} />
          ))}
        </div>
      )}
      {hasAudio && (
        <ul className={audioClassName}>
          {audio.map((attachment) => (
            <li key={attachment.key} className={audioItemClassName}>
              {attachment.content}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
