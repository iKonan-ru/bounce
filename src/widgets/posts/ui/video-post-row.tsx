import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { POST_STATUS_DOT } from '@/entities/post';
import { formatPublicationDate } from '@/entities/video-post';
import { cn } from '@/shared/utils';
import type { VideoPostRowProps } from '../types/publishing';
import { PostSwipe } from './post-swipe';

/** Аккаунт различает публикации даже на одной площадке */
export function VideoPostRow({
  post,
  accountName,
  videoTitle,
  onOpen,
}: VideoPostRowProps): ReactNode {
  const onClick = (): void => onOpen(post.id);

  return (
    <PostSwipe post={post} isVideo>
      <button
        data-swipe-row
        type="button"
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-groove/40"
        onClick={onClick}
      >
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            POST_STATUS_DOT[post.status]
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{post.title}</span>
          <span className="block truncate text-xs text-dim">
            {accountName} / {formatPublicationDate(post)}
          </span>
          {videoTitle && (
            <span className="block truncate text-xs text-dim">
              {videoTitle}
            </span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim" />
      </button>
    </PostSwipe>
  );
}
