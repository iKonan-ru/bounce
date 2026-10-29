import type { ReactNode } from 'react';
import { AvatarStack } from '@/entities/project';
import {
  getServiceById,
  POST_PLATFORMS,
  ServiceIcon,
} from '@/entities/service';
import { MentionText } from '@/entities/user';
import { Due } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { usePostRow } from '../hooks/use-post-row';
import type { PlatformsProps, PostRowProps } from '../types/post-row';
import { PostStatusDot } from './post-status-dot';

/** Значки площадок публикации; неизвестные id пропускаются */
function Platforms({ ids, className }: PlatformsProps): ReactNode {
  if (ids.length === 0) {
    return null;
  }

  const services = ids.flatMap(
    (id) => getServiceById(POST_PLATFORMS, id) ?? []
  );
  const platformsClassName = cn('flex items-center gap-1', className);

  return (
    <span className={platformsClassName}>
      {services.map((service) => (
        <ServiceIcon key={service.id} service={service} className="size-3.5" />
      ))}
    </span>
  );
}

/** Строка публикации: статус, что выкладываем, площадки, песня, когда и кто */
export function PostRow({
  post,
  songs,
  onOpen,
  showSong = true,
}: PostRowProps): ReactNode {
  const {
    date,
    dateLabel,
    bucket,
    assignees,
    platformIds,
    metaLabel,
    isPublished,
    showPublishedDate,
    titleClassName,
  } = usePostRow({ post, songs, showSong });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-groove/30"
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <PostStatusDot post={post} />
      </span>
      <span className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
        <span className={titleClassName}>
          <MentionText text={post.title} />
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-dim">
          <Platforms ids={platformIds} />
          <span className="truncate">{metaLabel}</span>
        </span>
      </span>
      {!isPublished && <Due due={date} bucket={bucket} />}
      {showPublishedDate && (
        <span className="shrink-0 text-xs text-dim tabular-nums">
          {dateLabel}
        </span>
      )}
      <AvatarStack users={assignees} />
    </button>
  );
}
