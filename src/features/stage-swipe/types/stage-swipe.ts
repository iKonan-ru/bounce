import type { ReactNode } from 'react';
import type { StageStatus } from '@/entities/song';

/** Общие действия этапов песни и видео */
export interface StageSwipeProps {
  projectId: string;
  songId?: string;
  stage: { id: string; title: string; status: StageStatus };
  children: ReactNode;
}

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
