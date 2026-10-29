import type { Post } from '@/entities/post';
import type { Song } from '@/entities/song';
import type { User } from '@/entities/user';
import type { Bucket } from '@/shared/types';

/** Пропсы цвета статуса публикации */
export interface PostStatusDotProps {
  post: Pick<Post, 'status'>;
}

/** Пропсы значков площадок */
export interface PlatformsProps {
  /** Id площадок из POST_PLATFORMS */
  ids: readonly string[];
  className?: string;
}

/** Пропсы строки публикации */
export interface PostRowProps {
  post: Post;
  /** Песни проекта: для названия песни и даты от релиза */
  songs: readonly Song[];
  onOpen: () => void;
  /** Показывать название песни (в карточке песни оно лишнее) */
  showSong?: boolean;
}

/** Что показать в строке публикации */
export interface UsePostRowResult {
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
