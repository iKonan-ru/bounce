import type { ReactNode } from 'react';
import { POST_STATUS_DOT } from '@/entities/post';
import { cn } from '@/shared/utils';
import type { PostStatusDotProps } from '../types/post-row';

/** Цвет статуса публикации */
export function PostStatusDot({ post }: PostStatusDotProps): ReactNode {
  const dotClassName = cn(
    'size-2.5 shrink-0 rounded-full',
    POST_STATUS_DOT[post.status]
  );

  return <span aria-hidden="true" className={dotClassName} />;
}
