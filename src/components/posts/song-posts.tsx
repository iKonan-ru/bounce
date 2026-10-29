import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { GROUP_ROWS, Section } from '@/components/page';
import { PostComposer } from '@/components/posts/post-composer';
import { PostDialog } from '@/components/posts/post-dialog';
import { PostRow } from '@/components/posts/post-row';
import { PromoButton } from '@/components/posts/promo-button';
import type { Song } from '@/lib/model';
import { songPosts } from '@/lib/posts';
import { postsQuery, songsQuery } from '@/lib/queries';

// Публикации песни - в её карточке, рядом с релизом.
export function SongPosts({
  song,
  meId,
  canWork,
}: {
  song: Song;
  meId: string | undefined;
  canWork: boolean;
}) {
  const songs = useQuery(songsQuery(song.project));
  const posts = useQuery(postsQuery(song.project));
  const [openId, setOpenId] = useState<string>();
  const list = songs.data ?? [song];
  const mine = songPosts(posts.data ?? [], song.id, list);
  const opened = posts.data?.find((p) => p.id === openId);
  if (!canWork && mine.length === 0) return null;
  return (
    <Section
      title="Публикации"
      action={
        mine.length > 0 ? (
          <span className="text-sm text-dim tabular-nums">{mine.length}</span>
        ) : (
          canWork && meId && <PromoButton song={song} meId={meId} />
        )
      }
    >
      <div className="flex flex-col gap-3">
        {mine.length > 0 && (
          <ul className={GROUP_ROWS}>
            {mine.map((p) => (
              <li key={p.id} className="animate-enter">
                <PostRow post={p} songs={list} showSong={false} onOpen={() => setOpenId(p.id)} />
              </li>
            ))}
          </ul>
        )}
        {canWork && meId && (
          <PostComposer
            projectId={song.project}
            meId={meId}
            song={song}
            onCreated={(p) => setOpenId(p.id)}
          />
        )}
      </div>
      {opened && (
        <PostDialog
          post={opened}
          canWork={canWork}
          open
          onOpenChange={(o) => !o && setOpenId(undefined)}
        />
      )}
    </Section>
  );
}
