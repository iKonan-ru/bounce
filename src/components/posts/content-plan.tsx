import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Post } from '@/entities/post';
import { postsQuery, groupPosts } from '@/entities/post';
import { songsQuery } from '@/entities/song';
import type { PlanGroup } from '@/shared/types';
import { Loading, EmptyState, BucketedSections } from '@/shared/ui';
import { useQuery } from '@tanstack/react-query';
import { PostComposer } from './post-composer';
import { PostDialog } from './post-dialog';
import { PostRow } from './post-row';

/** Пропсы контент-плана */
interface ContentPlanProps {
  projectId: string;
  meId: string | undefined;
  /** Id исполнителя: только его публикации ("На мне"); без него - все */
  assigneeId: string | undefined;
  canWork: boolean;
}

/** Состояние и обработчики контент-плана */
interface UseContentPlanResult {
  groups: PlanGroup<Post>[];
  published: Post[];
  openedPost: Post | undefined;
  isLoading: boolean;
  showEmpty: boolean;
  emptyText: string;
  renderPost: (post: Post) => ReactNode;
  onPostCreated: (post: Post) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}

/** Логика контент-плана: публикации по срокам и открытая публикация */
function useContentPlan({
  projectId,
  assigneeId,
}: ContentPlanProps): UseContentPlanResult {
  const songs = useQuery(songsQuery(projectId));
  const posts = useQuery(postsQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const songList = songs.data ?? [];
  const { groups, published } = groupPosts(
    posts.data ?? [],
    songList,
    new Date(),
    assigneeId
  );
  const openedPost = posts.data?.find((post) => post.id === openId);
  const isLoading = posts.isPending || songs.isPending;
  const showEmpty = [
    posts.isSuccess,
    groups.length === 0,
    published.length === 0,
  ].every(Boolean);
  const emptyText = assigneeId ? 'На вас пока ничего' : 'Публикаций пока нет';

  const createOnPostOpen =
    (postId: string): (() => void) =>
    (): void => {
      setOpenId(postId);
    };
  const renderPost = (post: Post): ReactNode => {
    const onOpen = createOnPostOpen(post.id);

    return <PostRow post={post} songs={songList} onOpen={onOpen} />;
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
    groups,
    published,
    openedPost,
    isLoading,
    showEmpty,
    emptyText,
    renderPost,
    onPostCreated,
    onDialogOpenChange,
  };
}

/** Контент-план проекта: публикации по срокам выхода; опубликованные - свёрнуты внизу */
export function ContentPlan({
  projectId,
  meId,
  assigneeId,
  canWork,
}: ContentPlanProps): ReactNode {
  const {
    groups,
    published,
    openedPost,
    isLoading,
    showEmpty,
    emptyText,
    renderPost,
    onPostCreated,
    onDialogOpenChange,
  } = useContentPlan({ projectId, meId, assigneeId, canWork });
  // проверка здесь, а не в хуке: так TypeScript знает, что meId есть
  const canCompose = canWork && !!meId;

  return (
    <div className="flex flex-col gap-8">
      {canCompose && (
        <PostComposer
          projectId={projectId}
          meId={meId}
          onCreated={onPostCreated}
        />
      )}
      {isLoading && <Loading className="h-40 rounded-xl" />}
      {showEmpty && <EmptyState>{emptyText}</EmptyState>}
      <BucketedSections
        groups={groups}
        noneLabel="Без даты"
        renderItem={renderPost}
        done={published}
        doneLabel="Опубликовано"
        renderDone={renderPost}
      />
      {openedPost && (
        <PostDialog
          post={openedPost}
          canWork={canWork}
          open
          onOpenChange={onDialogOpenChange}
        />
      )}
    </div>
  );
}
