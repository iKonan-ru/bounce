/** Id маршрута страницы текста песни */
export const LYRICS_ROUTE_ID = '/app/p/$projectId/songs/$songId/lyrics';

/** Ключ хранилища для размера шрифта чтения - удобство этого устройства */
export const LYRICS_SIZE_KEY = 'bounce.lyrics-size';

/** Классы размеров шрифта чтения, от мелкого к крупному */
export const LYRICS_SIZE_CLASSES: readonly string[] = [
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
];

/** Номер размера шрифта по умолчанию в LYRICS_SIZE_CLASSES */
export const DEFAULT_SIZE_INDEX = 1;

/** Номер самого крупного размера шрифта */
export const MAX_SIZE_INDEX = LYRICS_SIZE_CLASSES.length - 1;

/** Предел длины текста песни */
export const LYRICS_MAX_LENGTH = 50000;

/** Высота поля правки в строках */
export const EDITOR_ROWS = 18;

/** Id поля правки текста */
export const LYRICS_TEXTAREA_ID = 'lyrics-text';
