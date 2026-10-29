import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import type { Point, Area } from 'react-easy-crop';
import { toast } from 'sonner';
import {
  INITIAL_CROP,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from '../constants/avatar-crop';
import type { CropBodyProps, UseCropBodyResult } from '../types/avatar-crop';
import { cropImage } from '../utils/images';

/** Положение, масштаб и вырезание квадрата из фото */
export function useCropBody({
  file,
  onDone,
}: Pick<CropBodyProps, 'file' | 'onDone'>): UseCropBodyResult {
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
    setZoom((currentZoom) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + delta))
    );
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
