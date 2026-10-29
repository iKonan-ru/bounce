import { Download, X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Пропсы просмотра картинки на весь экран */
interface ImageViewerProps {
  /** Адрес картинки; без него окно закрыто */
  src: string | undefined;
  title: string;
  /** Адрес исходного файла для скачивания */
  downloadUrl?: string | undefined;
  onClose: () => void;
}

/** Кнопка поверх картинки */
const OVERLAY_BUTTON_CLASS_NAME =
  'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70';

/** Кнопка закрытия: в правом верхнем углу */
const CLOSE_BUTTON_CLASS_NAME = cn(
  'absolute top-2 right-2 size-9',
  OVERLAY_BUTTON_CLASS_NAME
);

/** Кнопка скачивания: в правом нижнем углу */
const DOWNLOAD_BUTTON_CLASS_NAME = cn(
  'absolute right-2 bottom-2 h-9 gap-1.5 px-3.5 text-sm font-medium',
  OVERLAY_BUTTON_CLASS_NAME
);

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
