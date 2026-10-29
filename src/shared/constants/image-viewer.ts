import { cn } from '../utils/cn';

/** Кнопка поверх картинки */
const OVERLAY_BUTTON_CLASS_NAME =
  'flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70';

/** Кнопка закрытия: в правом верхнем углу */
export const CLOSE_BUTTON_CLASS_NAME = cn(
  'absolute top-2 right-2 size-9',
  OVERLAY_BUTTON_CLASS_NAME
);

/** Кнопка скачивания: в правом нижнем углу */
export const DOWNLOAD_BUTTON_CLASS_NAME = cn(
  'absolute right-2 bottom-2 h-9 gap-1.5 px-3.5 text-sm font-medium',
  OVERLAY_BUTTON_CLASS_NAME
);
