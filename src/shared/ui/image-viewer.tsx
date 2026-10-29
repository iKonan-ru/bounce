import { X, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  CLOSE_BUTTON_CLASS_NAME,
  DOWNLOAD_BUTTON_CLASS_NAME,
} from '../constants/image-viewer';
import type { ImageViewerProps } from '../types/image-viewer';
import { Dialog, DialogContent, DialogTitle, DialogClose } from './kit/dialog';

/**
 * Картинка на весь экран - ровно по своему размеру, без рамок
 *
 * Закрыть и скачать исходный файл (downloadUrl) - кнопками поверх картинки
 */
export function ImageViewer({
  src,
  title,
  downloadUrl,
  onClose,
}: ImageViewerProps): ReactNode {
  const isOpen = src !== undefined;
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block w-auto max-w-none overflow-hidden rounded-xl bg-transparent p-0 shadow-2xl ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {src && (
          <img
            src={src}
            alt={title}
            className="block h-auto max-h-[88dvh] w-auto max-w-[94vw] bg-groove"
          />
        )}
        <DialogClose className={CLOSE_BUTTON_CLASS_NAME} aria-label="Закрыть">
          <X className="size-4" />
        </DialogClose>
        {downloadUrl && (
          <a href={downloadUrl} download className={DOWNLOAD_BUTTON_CLASS_NAME}>
            <Download className="size-4" />
            Скачать оригинал
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
