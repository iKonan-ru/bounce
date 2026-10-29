import type { Point } from 'react-easy-crop';

/** Наименьший масштаб: картинка целиком закрывает кружок */
export const MIN_ZOOM = 1;

/** Наибольший масштаб */
export const MAX_ZOOM = 4;

/** Шаг масштаба кнопками приближения и отдаления */
export const ZOOM_STEP = 0.25;

/** Исходное положение картинки: по центру */
export const INITIAL_CROP: Point = { x: 0, y: 0 };
