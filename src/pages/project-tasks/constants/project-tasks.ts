import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import type { ProjectTaskFilter } from '../types/project-task';

/** Фильтры списка задач */
export const TASK_FILTERS: { value: ProjectTaskFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  ...TASK_STATUS_OPTIONS,
];

/** Колонки по образцу списка видео */
export const TABLE_COLUMNS =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:gap-6';

/** Задержка перед перетаскиванием всей строки */
export const ORDER_PRESS_DELAY_MS = 150;
