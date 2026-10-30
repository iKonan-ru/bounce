import type { ReactNode } from 'react';
import type { Video } from '@/entities/video';

/** Строка видео с ручкой порядка */
export interface VideoRowProps {
  video: Video;
  handle: ReactNode;
  projectId: string;
}
