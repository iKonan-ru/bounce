import { Download, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

// Картинка на весь экран - ровно по своему размеру, без рамок; закрыть и скачать исходный файл
// (downloadUrl) - кнопками поверх картинки.
export function ImageViewer({
  src,
  title,
  downloadUrl,
  onClose,
}: {
  src: string | undefined;
  title: string;
  downloadUrl?: string | undefined;
  onClose: () => void;
}) {
  const over =
    'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70';
  return (
    <Dialog open={src !== undefined} onOpenChange={(o) => !o && onClose()}>
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
        <DialogClose className={`absolute top-2 right-2 size-9 ${over}`} aria-label="Закрыть">
          <X className="size-4" />
        </DialogClose>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className={`absolute right-2 bottom-2 h-9 gap-1.5 px-3.5 text-sm font-medium ${over}`}
          >
            <Download className="size-4" />
            Скачать оригинал
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
