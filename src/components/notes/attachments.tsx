import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Классы ячейки в сетке картинок */
const IMAGE_CELL_CLASS = 'aspect-square overflow-hidden rounded-md bg-groove';

/** Как показывать аудио во вложениях */
export enum AudioView {
  /** Плееры столбиком: у отправленной заметки */
  Players = 'players',
  /** Имена файлов в строку: у ждущей отправки */
  Names = 'names',
}

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

/** Ключ файла на устройстве для списков: имя, размер и время изменения */
export function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Пропсы превью локальной картинки */
interface LocalImageProps {
  file: File;
}

/** Превью выбранной, но ещё не загруженной картинки */
export function LocalImage({ file }: LocalImageProps): ReactNode {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!url) {
    return null;
  }

  return <img src={url} alt={file.name} className="size-full object-cover" />;
}

/** Пропсы ячейки картинки */
interface PictureCellProps {
  picture: Picture;
}

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

/** Пропсы вложений заметки */
interface NoteAttachmentsProps {
  images: readonly Picture[];
  audio: readonly Attachment[];
  audioView: AudioView;
  /** Отступ слева: у отправленной заметки блоки стоят под текстом, правее аватара */
  className?: string | undefined;
}

/** Что показать во вложениях заметки */
interface UseNoteAttachmentsResult {
  hasImages: boolean;
  hasAudio: boolean;
  imagesClassName: string;
  audioClassName: string;
  /** Классы аудио в списке: у имён файлов - плашка, у плееров - нет */
  audioItemClassName: string | undefined;
}

/** Логика вложений заметки: что показывать и как */
function useNoteAttachments({
  images,
  audio,
  audioView,
  className,
}: NoteAttachmentsProps): UseNoteAttachmentsResult {
  const arePlayers = audioView === AudioView.Players;
  const areNames = audioView === AudioView.Names;
  const imagesClassName = cn(
    'mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4',
    className
  );
  const audioClassName = cn(
    'mt-2 flex gap-2',
    { 'flex-col': arePlayers, 'flex-wrap': !arePlayers },
    className
  );
  const audioItemClassName = areNames
    ? 'flex items-center gap-1 rounded-md bg-groove px-2 py-1 text-xs'
    : undefined;

  return {
    hasImages: images.length > 0,
    hasAudio: audio.length > 0,
    imagesClassName,
    audioClassName,
    audioItemClassName,
  };
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
