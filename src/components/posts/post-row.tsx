import type { ReactNode } from 'react';
import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { Due } from '@/components/plan-bits';
import { ServiceIcon } from '@/components/service-icon';
import { getDateLabel } from '@/lib/format';
import {
  type Post,
  PostAnchor,
  PostStatus,
  type Song,
  type User,
} from '@/lib/model';
import { getPeopleById, useProjectPeople } from '@/lib/people';
import { type Bucket, getBucket } from '@/lib/plan';
import { getOffsetLabel, getPostDate, POST_STATUS_DOT } from '@/lib/posts';
import { getServiceById, POST_PLATFORMS } from '@/lib/services';
import { POST_STATUS_LABEL } from '@/lib/statuses';
import { cn } from '@/lib/utils';

/** Разделитель подробностей в строке публикации: точка по центру с пробелами */
const META_SEPARATOR = ' \u00B7 ';

/** Песня публикации среди песен проекта */
export function findPostSong(
  post: Post,
  songs: readonly Song[]
): Song | undefined {
  if (!post.song) {
    return undefined;
  }

  return songs.find((song) => song.id === post.song);
}

/** Когда выходит публикация от релиза словами; с обычной датой - пусто */
function getReleaseOffsetLabel(post: Post): string {
  if (post.anchor !== PostAnchor.release) {
    return '';
  }

  return getOffsetLabel(post.offset ?? 0);
}

/** Пропсы цвета статуса публикации */
interface PostStatusDotProps {
  post: Pick<Post, 'status'>;
}

/** Цвет статуса публикации */
export function PostStatusDot({ post }: PostStatusDotProps): ReactNode {
  const dotClassName = cn(
    'size-2.5 shrink-0 rounded-full',
    POST_STATUS_DOT[post.status]
  );

  return <span aria-hidden="true" className={dotClassName} />;
}

/** Пропсы значков площадок */
interface PlatformsProps {
  /** Id площадок из POST_PLATFORMS */
  ids: readonly string[];
  className?: string;
}

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

/** Пропсы строки публикации */
interface PostRowProps {
  post: Post;
  /** Песни проекта: для названия песни и даты от релиза */
  songs: readonly Song[];
  onOpen: () => void;
  /** Показывать название песни (в карточке песни оно лишнее) */
  showSong?: boolean;
}

/** Что показать в строке публикации */
interface UsePostRowResult {
  date: string;
  dateLabel: string;
  bucket: Bucket;
  assignees: User[];
  platformIds: string[];
  metaLabel: string;
  isPublished: boolean;
  showPublishedDate: boolean;
  titleClassName: string;
}

/** Логика строки публикации: дата, срок, исполнители и подробности */
function usePostRow({
  post,
  songs,
  showSong,
}: Omit<PostRowProps, 'onOpen'>): UsePostRowResult {
  const projectPeople = useProjectPeople(post.project);
  const people = getPeopleById(projectPeople);
  const song = findPostSong(post, songs);
  const date = getPostDate(post, songs);
  const bucket = getBucket(date, new Date());
  const assignees = (post.assignees ?? []).flatMap(
    (id) => people.get(id) ?? []
  );
  const releaseOffsetLabel = getReleaseOffsetLabel(post);
  const songTitle = showSong ? song?.title : '';
  const metaLabel = [
    songTitle,
    releaseOffsetLabel,
    POST_STATUS_LABEL[post.status],
  ]
    .filter(Boolean)
    .join(META_SEPARATOR);
  const isPublished = post.status === PostStatus.published;
  const showPublishedDate = isPublished && Boolean(date);
  const titleClassName = cn('text-pretty', { 'text-dim': isPublished });

  return {
    date,
    dateLabel: getDateLabel(date),
    bucket,
    assignees,
    platformIds: post.platforms ?? [],
    metaLabel,
    isPublished,
    showPublishedDate,
    titleClassName,
  };
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
