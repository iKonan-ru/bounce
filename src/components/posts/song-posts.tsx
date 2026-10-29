import { type ReactNode, useState } from 'react';
import { GROUP_ROWS, Section } from '@/components/page';
import { PostComposer } from '@/components/posts/post-composer';
import { PostDialog } from '@/components/posts/post-dialog';
import { PostRow } from '@/components/posts/post-row';
import { PromoButton } from '@/components/posts/promo-button';
import type { Post, Song } from '@/lib/model';
import { getSongPosts } from '@/lib/posts';
import { postsQuery, songsQuery } from '@/lib/queries';
import { useQuery } from '@tanstack/react-query';

/** Пропсы публикации в карточке песни */
interface SongPostItemProps {
  post: Post;
  songs: readonly Song[];
  onPostOpen: (postId: string) => void;
}

/** Публикация в списке карточки песни: без названия песни */
function SongPostItem({
  post,
  songs,
  onPostOpen,
}: SongPostItemProps): ReactNode {
  const onOpen = (): void => {
    onPostOpen(post.id);
  };

  return (
    <li className="animate-enter">
      <PostRow post={post} songs={songs} showSong={false} onOpen={onOpen} />
    </li>
  );
}

/** Пропсы публикаций песни */
interface SongPostsProps {
  song: Song;
  meId: string | undefined;
  canWork: boolean;
}

/** Состояние и обработчики публикаций песни */
interface UseSongPostsResult {
  /** Песни проекта: для дат публикаций от релиза */
  songList: Song[];
  songPosts: Post[];
  hasPosts: boolean;
  openedPost: Post | undefined;
  onPostOpen: (postId: string) => void;
  onPostCreated: (post: Post) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}

/** Логика публикаций песни: список и открытая публикация */
function useSongPosts(song: Song): UseSongPostsResult {
  const songs = useQuery(songsQuery(song.project));
  const posts = useQuery(postsQuery(song.project));
  const [openId, setOpenId] = useState<string>();
  const songList = songs.data ?? [song];
  const songPosts = getSongPosts(posts.data ?? [], song.id, songList);
  const openedPost = posts.data?.find((post) => post.id === openId);
  const onPostOpen = (postId: string): void => {
    setOpenId(postId);
  };
  const onPostCreated = (post: Post): void => {
    setOpenId(post.id);
  };
  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setOpenId(undefined);
    }
  };

  return {
    songList,
    songPosts,
    hasPosts: songPosts.length > 0,
    openedPost,
    onPostOpen,
    onPostCreated,
    onDialogOpenChange,
  };
}

/** Публикации песни - в её карточке, рядом с релизом */
export function SongPosts({ song, meId, canWork }: SongPostsProps): ReactNode {
  const {
    songList,
    songPosts,
    hasPosts,
    openedPost,
    onPostOpen,
    onPostCreated,
    onDialogOpenChange,
  } = useSongPosts(song);
  // проверка здесь, а не в хуке: так TypeScript знает, что meId есть
  const canCompose = canWork && !!meId;
  const isHidden = !canWork && !hasPosts;

  if (isHidden) {
    return null;
  }

  const postCount = (
    <span className="text-sm text-dim tabular-nums">{songPosts.length}</span>
  );
  const promoButton = canCompose && <PromoButton song={song} meId={meId} />;
  const sectionAction = hasPosts ? postCount : promoButton;

  return (
    <Section title="Публикации" action={sectionAction}>
      <div className="flex flex-col gap-3">
        {hasPosts && (
          <ul className={GROUP_ROWS}>
            {songPosts.map((post) => (
              <SongPostItem
                key={post.id}
                post={post}
                songs={songList}
                onPostOpen={onPostOpen}
              />
            ))}
          </ul>
        )}
        {canCompose && (
          <PostComposer
            projectId={song.project}
            meId={meId}
            song={song}
            onCreated={onPostCreated}
          />
        )}
      </div>
      {openedPost && (
        <PostDialog
          post={openedPost}
          canWork={canWork}
          open
          onOpenChange={onDialogOpenChange}
        />
      )}
    </Section>
  );
}
