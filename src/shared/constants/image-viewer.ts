import { cn } from '../utils/cn';

/** Управление просмотром на светлой или темной поверхности */
const VIEWER_BUTTON_CLASS_NAME =
  'flex items-center justify-center rounded-full bg-panel/80 text-ink shadow-sm ring-1 ring-ink/10 transition-colors hover:bg-panel focus-visible:outline-2 focus-visible:outline-ink';

/** Минимальная длина горизонтального свайпа в просмотрщике */
export const IMAGE_SWIPE_THRESHOLD = 50;

/** Сопротивление движению за краем галереи */
export const IMAGE_SWIPE_RESISTANCE = 0.25;

/** Стрелки остаются по краям экрана */
export const IMAGE_NAVIGATION_CLASS_NAME = cn(
  'absolute top-1/2 size-11 -translate-y-1/2 disabled:opacity-30',
  VIEWER_BUTTON_CLASS_NAME
);

/** Кнопка закрытия в верхней панели */
export const CLOSE_BUTTON_CLASS_NAME = cn('size-11', VIEWER_BUTTON_CLASS_NAME);

/** Скачивание выбранного оригинала в верхней панели */
export const DOWNLOAD_BUTTON_CLASS_NAME = cn(
  'h-11 gap-1.5 px-3.5 text-sm font-medium',
  VIEWER_BUTTON_CLASS_NAME
);
