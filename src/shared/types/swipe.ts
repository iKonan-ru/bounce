import type { ReactNode } from 'react';

/** Доступные жесты строки */
export interface SwipeGestureOptions {
  canAdvance: boolean;
  canDelete: boolean;
  onAdvance: () => void;
}

/** Начало жеста и выбранная ось движения */
export interface SwipeGesture {
  id: number;
  x: number;
  y: number;
  offset: number;
  axis: 'pending' | 'horizontal' | 'vertical';
}

/** Действия строки, общие для этапов и публикаций. */
export interface SwipeRowProps extends SwipeGestureOptions {
  canDelete: boolean;
  isFinishing: boolean;
  advanceLabel: string;
  deleteLabel: string;
  onDeleteClick: () => void;
  children: ReactNode;
}
