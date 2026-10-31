import { VIDEO_STATUS_OPTIONS } from '@/entities/video';
import type { VideoFilter } from '../types/videos';

/** Фильтры списка видео */
export const VIDEO_FILTERS: { value: VideoFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  ...VIDEO_STATUS_OPTIONS,
];

/** Колонки списка без музыкального выпуска */
export const TABLE_COLUMNS =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:gap-6';

/** Задержка перед перетаскиванием всей строки */
export const ORDER_PRESS_DELAY_MS = 150;
