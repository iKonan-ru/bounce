import type { ReactNode } from 'react';
import type { Post } from '@/entities/post';
import type { VideoPost } from '@/entities/video-post';

/** Публикации музыки и видео используют одинаковые жесты и статусы. */
export interface PostSwipeProps {
  post: Post | VideoPost;
  isVideo?: boolean;
  children: ReactNode;
}
