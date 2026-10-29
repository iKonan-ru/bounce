import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BucketedSections } from '@/components/bucketed-sections';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/page';
import { PostComposer } from '@/components/posts/post-composer';
import { PostDialog } from '@/components/posts/post-dialog';
import { PostRow } from '@/components/posts/post-row';
import { groupPosts } from '@/lib/posts';
import { postsQuery, songsQuery } from '@/lib/queries';

// Контент-план проекта: публикации по срокам выхода; опубликованные - свёрнуты внизу.
export function ContentPlan({
  projectId,
  meId,
  mine,
  canWork,
}: {
  projectId: string;
  meId: string | undefined;
  mine: string | undefined;
  canWork: boolean;
}) {
  const songs = useQuery(songsQuery(projectId));
  const posts = useQuery(postsQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const list = songs.data ?? [];
  const { groups, published } = groupPosts(posts.data ?? [], list, new Date(), mine);
  const opened = posts.data?.find((p) => p.id === openId);

  return (
    <div className="flex flex-col gap-8">
      {canWork && meId && (
        <PostComposer projectId={projectId} meId={meId} onCreated={(p) => setOpenId(p.id)} />
      )}
      {(posts.isPending || songs.isPending) && <Loading className="h-40 rounded-xl" />}
      {posts.isSuccess && groups.length === 0 && published.length === 0 && (
        <EmptyState>{mine ? 'На вас пока ничего' : 'Публикаций пока нет'}</EmptyState>
      )}
      <BucketedSections
        groups={groups}
        noneLabel="Без даты"
        renderItem={(p) => <PostRow post={p} songs={list} onOpen={() => setOpenId(p.id)} />}
        done={published}
        doneLabel="Опубликовано"
        renderDone={(p) => <PostRow post={p} songs={list} onOpen={() => setOpenId(p.id)} />}
      />
      {opened && (
        <PostDialog
          post={opened}
          canWork={canWork}
          open
          onOpenChange={(o) => !o && setOpenId(undefined)}
        />
      )}
    </div>
  );
}
