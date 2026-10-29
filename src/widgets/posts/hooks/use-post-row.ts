import type { Post } from '@/entities/post';
import {
  PostAnchor,
  getOffsetLabel,
  findPostSong,
  getPostDate,
  POST_STATUS_LABEL,
  PostStatus,
} from '@/entities/post';
import { useProjectPeople, getPeopleById } from '@/entities/project';
import { getBucket, cn, getDateLabel } from '@/shared/utils';
import { META_SEPARATOR } from '../constants/post-row';
import type { PostRowProps, UsePostRowResult } from '../types/post-row';

/** Когда выходит публикация от релиза словами; с обычной датой - пусто */
function getReleaseOffsetLabel(post: Post): string {
  if (post.anchor !== PostAnchor.release) {
    return '';
  }

  return getOffsetLabel(post.offset ?? 0);
}

/** Логика строки публикации: дата, срок, исполнители и подробности */
export function usePostRow({
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
