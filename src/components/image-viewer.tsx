import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// Картинка на весь экран; downloadUrl - исходный файл для скачивания.
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
  return (
    <Dialog open={src !== undefined} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(96vw,72rem)] gap-2 p-2 sm:max-w-[min(96vw,72rem)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {src && (
          <img src={src} alt={title} className="max-h-[80dvh] w-full rounded-lg object-contain" />
        )}
        {downloadUrl && (
          <div className="flex justify-end px-1 pb-1">
            <Button variant="secondary" size="sm" className="h-9 px-3" asChild>
              <a href={downloadUrl} download>
                <Download data-icon="inline-start" />
                Скачать оригинал
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
