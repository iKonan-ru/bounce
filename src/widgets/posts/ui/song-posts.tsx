import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import { Section } from '@/shared/ui';
import { useSongPosts } from '../hooks/use-song-posts';
import type { SongPostItemProps, SongPostsProps } from '../types/song-posts';
import { PostComposer } from './post-composer';
import { PostDialog } from './post-dialog';
import { PostRow } from './post-row';
import { PromoButton } from './promo-button';

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
