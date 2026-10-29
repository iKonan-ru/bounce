import type { ChangeEvent } from 'react';
import type { Point, Area } from 'react-easy-crop';

/** Пропсы окна обрезки аватара */
export interface AvatarCropDialogProps {
  /** Выбранное фото; null - окно закрыто */
  file: File | null;
  title?: string;
  onCancel: () => void;
  /** Вырезанный квадрат */
  onDone: (file: File) => void;
}

/** Пропсы содержимого окна обрезки */
export interface CropBodyProps {
  file: File;
  onCancel: () => void;
  onDone: (file: File) => void;
}

/** Состояние и обработчики обрезки */
export interface UseCropBodyResult {
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
