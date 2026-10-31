import type { ReactNode } from 'react';
import type { StageStatus } from '@/entities/song';

/** Общие действия этапов песни и видео */
export interface StageSwipeProps {
  projectId: string;
  songId?: string;
  stage: { id: string; title: string; status: StageStatus };
  children: ReactNode;
}
