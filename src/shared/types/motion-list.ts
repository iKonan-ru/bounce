import type { ReactNode } from 'react';
import type { Identified } from './sortable';

/** Строка остаётся в списке до завершения сворачивания. */
export interface MotionRow<T extends Identified> {
  item: T;
  isLeaving: boolean;
}

/** Список с плавным появлением и исчезновением строк. */
export interface MotionListProps<T extends Identified> {
  items: T[];
  className?: string;
  children: (item: T) => ReactNode;
}
