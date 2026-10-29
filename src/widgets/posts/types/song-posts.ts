import type { Post } from '@/entities/post';
import type { Song } from '@/entities/song';

/** Пропсы публикации в карточке песни */
export interface SongPostItemProps {
  post: Post;
  songs: readonly Song[];
  onPostOpen: (postId: string) => void;
}

/** Пропсы публикаций песни */
export interface SongPostsProps {
  song: Song;
  meId: string | undefined;
  canWork: boolean;
}

/** Состояние и обработчики публикаций песни */
export interface UseSongPostsResult {
  /** Песни проекта: для дат публикаций от релиза */
  songList: Song[];
  songPosts: Post[];
  hasPosts: boolean;
  openedPost: Post | undefined;
  onPostOpen: (postId: string) => void;
  onPostCreated: (post: Post) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}
