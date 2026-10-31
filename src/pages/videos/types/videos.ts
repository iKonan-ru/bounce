import type { Video } from '@/entities/video';

/** Фильтр списка видео */
export type VideoFilter = 'all' | Video['status'];

/** Строка видео в обычном режиме или режиме порядка */
export interface VideoRowProps {
  video: Video;
  isOrdering?: boolean;
  projectId: string;
}
