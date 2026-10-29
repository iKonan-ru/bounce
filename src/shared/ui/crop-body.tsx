import { ZoomOut, ZoomIn } from 'lucide-react';
import type { ReactNode } from 'react';
import Cropper from 'react-easy-crop';
import { MIN_ZOOM, MAX_ZOOM } from '../constants/avatar-crop';
import { useCropBody } from '../hooks/use-crop-body';
import type { CropBodyProps } from '../types/avatar-crop';
import { Button } from './kit/button';
import { DialogFooter } from './kit/dialog';

/** Обрезка фото: область с кружком, масштаб и кнопки */
export function CropBody({ file, onCancel, onDone }: CropBodyProps): ReactNode {
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
