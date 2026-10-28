import 'react-easy-crop/react-easy-crop.css';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cropImage } from '@/lib/images';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// Что попадёт в кружок аватара: картинку двигают пальцем или мышью, приближают щипком,
// колёсиком или ползунком. "Готово" отдаёт вырезанный квадрат.
export function AvatarCropDialog({
  file,
  title = 'Фото профиля',
  onCancel,
  onDone,
}: {
  file: File | null;
  title?: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  return (
    <Dialog open={file !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* новое фото - с исходным положением и масштабом */}
        {file && (
          <CropBody
            key={`${file.name}-${file.size}-${file.lastModified}`}
            file={file}
            onCancel={onCancel}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CropBody({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const step = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + d)));

  async function done() {
    if (!area || busy) return;
    setBusy(true);
    try {
      onDone(await cropImage(file, area));
    } catch {
      toast.error('Картинку не удалось открыть: попробуйте JPEG или PNG');
      setBusy(false);
    }
  }

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
        {url && (
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            cropShape="round"
            showGrid={false}
            objectFit="cover"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            disableAutomaticStylesInjection
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Отдалить"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => step(-0.25)}
        >
          <ZoomOut />
        </Button>
        <input
          type="range"
          aria-label="Масштаб"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-9 min-w-0 flex-1 cursor-pointer accent-tape"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Приблизить"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => step(0.25)}
        >
          <ZoomIn />
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="button" disabled={!area || busy} onClick={done}>
          Готово
        </Button>
      </DialogFooter>
    </>
  );
}
