import 'react-easy-crop/react-easy-crop.css';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
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

/** Наименьший масштаб: картинка целиком закрывает кружок */
const MIN_ZOOM = 1;

/** Наибольший масштаб */
const MAX_ZOOM = 4;

/** Шаг масштаба кнопками приближения и отдаления */
const ZOOM_STEP = 0.25;

/** Исходное положение картинки: по центру */
const INITIAL_CROP: Point = { x: 0, y: 0 };

/** Пропсы окна обрезки аватара */
interface AvatarCropDialogProps {
  /** Выбранное фото; null - окно закрыто */
  file: File | null;
  title?: string;
  onCancel: () => void;
  /** Вырезанный квадрат */
  onDone: (file: File) => void;
}

/** Пропсы содержимого окна обрезки */
interface CropBodyProps {
  file: File;
  onCancel: () => void;
  onDone: (file: File) => void;
}

/** Состояние и обработчики обрезки */
interface UseCropBodyResult {
  /** Локальная ссылка на фото; пока не создана - undefined */
  url: string | undefined;
  crop: Point;
  zoom: number;
  setCrop: (crop: Point) => void;
  setZoom: (zoom: number) => void;
  canZoomOut: boolean;
  canZoomIn: boolean;
  isDoneDisabled: boolean;
  onCropComplete: (area: Area, pixels: Area) => void;
  onZoomOutClick: () => void;
  onZoomInClick: () => void;
  onZoomInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDoneClick: () => Promise<void>;
}

/** Ключ фото: новое фото - с исходным положением и масштабом */
function getCropKey(file: File | null): string {
  if (!file) {
    return '';
  }
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Что попадёт в кружок аватара: картинку двигают пальцем или мышью, приближают щипком,
 * колёсиком или ползунком
 *
 * "Готово" отдаёт вырезанный квадрат
 */
export function AvatarCropDialog({
  file,
  title = 'Фото профиля',
  onCancel,
  onDone,
}: AvatarCropDialogProps): ReactNode {
  const isOpen = file !== null;
  const cropKey = getCropKey(file);
  const onOpenChange = (isNextOpen: boolean): void => {
    if (!isNextOpen) {
      onCancel();
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* новое фото - с исходным положением и масштабом */}
        {file && <CropBody key={cropKey} file={file} onCancel={onCancel} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

/** Положение, масштаб и вырезание квадрата из фото */
function useCropBody({ file, onDone }: Pick<CropBodyProps, 'file' | 'onDone'>): UseCropBodyResult {
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState<Point>(INITIAL_CROP);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const changeZoomBy = (delta: number): void => {
    setZoom((currentZoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + delta)));
  };
  const onZoomOutClick = (): void => {
    changeZoomBy(-ZOOM_STEP);
  };
  const onZoomInClick = (): void => {
    changeZoomBy(ZOOM_STEP);
  };
  const onZoomInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setZoom(Number(event.target.value));
  };
  const onCropComplete = (_area: Area, pixels: Area): void => {
    setArea(pixels);
  };

  const onDoneClick = async (): Promise<void> => {
    if (!area) {
      return;
    }
    if (isBusy) {
      return;
    }
    setIsBusy(true);
    try {
      onDone(await cropImage(file, area));
    } catch {
      toast.error('Картинку не удалось открыть: попробуйте JPEG или PNG');
      setIsBusy(false);
    }
  };

  const isDoneDisabled = !area || isBusy;

  return {
    url,
    crop,
    zoom,
    setCrop,
    setZoom,
    canZoomOut: zoom > MIN_ZOOM,
    canZoomIn: zoom < MAX_ZOOM,
    isDoneDisabled,
    onCropComplete,
    onZoomOutClick,
    onZoomInClick,
    onZoomInputChange,
    onDoneClick,
  };
}

/** Обрезка фото: область с кружком, масштаб и кнопки */
function CropBody({ file, onCancel, onDone }: CropBodyProps): ReactNode {
  const {
    url,
    crop,
    zoom,
    setCrop,
    setZoom,
    canZoomOut,
    canZoomIn,
    isDoneDisabled,
    onCropComplete,
    onZoomOutClick,
    onZoomInClick,
    onZoomInputChange,
    onDoneClick,
  } = useCropBody({ file, onDone });

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
            onCropComplete={onCropComplete}
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
          disabled={!canZoomOut}
          onClick={onZoomOutClick}
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
          onChange={onZoomInputChange}
          className="h-9 min-w-0 flex-1 cursor-pointer accent-tape"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Приблизить"
          disabled={!canZoomIn}
          onClick={onZoomInClick}
        >
          <ZoomIn />
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="button" disabled={isDoneDisabled} onClick={onDoneClick}>
          Готово
        </Button>
      </DialogFooter>
    </>
  );
}
