import type { ReactNode, RefObject, ChangeEvent } from 'react';
import type { PendingImage } from './image-upload';
import type { FileRecord } from './records';

/** Пропсы картинки-места */
export interface ImageSlotProps {
  record: FileRecord;
  file: string | undefined;
  thumb: string;
  title: string;
  placeholder: ReactNode;
  /** Выбор файла по нажатию на пустое место; без него пустое место не нажимается */
  onPick?: ((file: File) => void) | undefined;
  accept?: string;
  pending?: PendingImage | undefined;
  /** Загруженная открывается на весь экран со скачиванием оригинала; аватару проекта не нужно */
  canZoom?: boolean;
  /** Загруженную можно заменить нажатием (вместо открытия на весь экран) */
  canReplace?: boolean;
  /** Крестик над картинкой: убрать её */
  onRemove?: (() => void) | undefined;
  className?: string;
}

/** Пропсы картинки в пути на сервер */
export interface PendingSlotProps {
  pending: PendingImage;
  title: string;
  /** Классы места картинки */
  slotClassName: string;
}

/** Действие по нажатию на картинку-место и подсветка при наведении */
export interface SlotLook {
  /** Подпись действия для экранного диктора */
  action: string;
  hoverClassName: string;
}

/** Состояние и обработчики картинки-места */
export interface UseImageSlotResult {
  inputRef: RefObject<HTMLInputElement | null>;
  slotClassName: string;
  /** Загруженная картинка; пока ссылки нет - null */
  image: ReactNode;
  /** Файла нет вовсе - на месте картинки подсказка */
  showPlaceholder: boolean;
  /** Загруженную картинку нажатием заменяют новой */
  canPickFilled: boolean;
  /** Картинку не нажать: пустая без выбора файла или загруженная без действия */
  isStatic: boolean;
  showRemove: boolean;
  buttonLabel: string;
  removeLabel: string;
  buttonClassName: string;
  viewerSrc: string | undefined;
  downloadUrl: string | undefined;
  onSlotClick: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewerClose: () => void;
}

/** Ширина и высота картинки в точках */
export interface ImageSize {
  width: number;
  height: number;
}

/** Квадрат обрезки в точках исходной картинки */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Формат картинки после обработки */
export interface OutputFormat {
  isPng: boolean;
  type: string;
  extension: string;
}
