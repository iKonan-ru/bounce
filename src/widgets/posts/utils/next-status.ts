import { PostStatus } from '@/entities/post';

/** Опубликованная запись не возвращается к идее при повторном свайпе. */
export function getNextPostStatus(status: PostStatus): PostStatus | null {
  switch (status) {
    case PostStatus.idea:
      return PostStatus.preparing;
    case PostStatus.preparing:
      return PostStatus.ready;
    case PostStatus.ready:
      return PostStatus.published;
    default:
      return null;
  }
}
