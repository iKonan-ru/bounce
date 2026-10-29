import { BYTES_IN_MEGABYTE, SECOND_MS } from './format';

/** Общие классы места картинки */
export const SLOT_CLASS_NAME =
  'inline-flex shrink-0 items-center justify-center overflow-hidden bg-groove text-dim';

/** Процентов в целом */
export const PERCENT = 100;

/** Наименьшая видимая ширина полоски хода, в процентах */
export const MIN_PROGRESS_PERCENT = 4;

/** Длинная сторона картинки после уменьшения: хватает для просмотра на весь экран */
export const MAX_IMAGE_SIDE = 2400;

/** Сторона аватара после обрезки: хватает для экранов с высокой плотностью точек */
export const AVATAR_SIDE = 512;

/** Файл в пределах размера и не тяжелее этого уходит как есть */
export const KEEP_BYTES = 1.5 * BYTES_IN_MEGABYTE;

/** Тип JPEG */
export const JPEG_TYPE = 'image/jpeg';

/** Тип PNG */
export const PNG_TYPE = 'image/png';

/** Форматы, которые уходят без изменений: анимация и вектор */
export const KEEP_AS_IS_TYPES: ReadonlySet<string> = new Set([
  'image/gif',
  'image/svg+xml',
]);

/** Форматы, которые браузеры показывают как есть */
export const WEB_IMAGE_TYPES: ReadonlySet<string> = new Set([
  JPEG_TYPE,
  PNG_TYPE,
  'image/webp',
]);

/** Качество JPEG после уменьшения */
export const SHRINK_JPEG_QUALITY = 0.86;

/** Качество JPEG аватара */
export const AVATAR_JPEG_QUALITY = 0.9;

/** Канал прозрачности в RGBA - четвёртый байт точки */
export const ALPHA_OFFSET = 3;

/** Шаг проверки прозрачности: каждая 16-я точка по 4 байта */
export const ALPHA_SAMPLE_STEP = 16 * 4;

/** Полностью непрозрачная точка */
export const OPAQUE_ALPHA = 255;

/** Сколько ждать уменьшенные копии картинок */
export const WARM_IMAGES_TIMEOUT_MS = 20 * SECOND_MS;

/** Имя файла без имени: для картинок без имени */
export const DEFAULT_IMAGE_NAME = 'image';

/** Масштаб без изменений */
export const ORIGINAL_SCALE = 1;
