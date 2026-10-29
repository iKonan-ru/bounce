/** Всё, что не цифра: в поле темпа остаются только цифры */
export const NON_DIGIT_RE = /\D/g;

/** Самый медленный темп, BPM */
export const MIN_BPM = 20;

/** Самый быстрый темп, BPM */
export const MAX_BPM = 400;

/** Поле формы, которое добавляет файл к обложкам песни */
export const COVERS_APPEND_FIELD = 'covers+';

/** Поле правки, которое убирает файл из обложек песни */
export const COVERS_REMOVE_FIELD = 'covers-';

/** Большая копия обложки: плитки и шапка песни */
export const COVER_THUMB_LARGE = '600x600';

/** Маленькая копия обложки: списки песен */
export const COVER_THUMB_SMALL = '96x96';

/** Множитель доли в проценты */
export const PERCENT = 100;
