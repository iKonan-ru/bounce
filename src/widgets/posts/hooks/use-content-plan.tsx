import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Post } from '@/entities/post';
import { postsQuery, groupPosts } from '@/entities/post';
import { songsQuery } from '@/entities/song';
import { useQuery } from '@tanstack/react-query';
import type {
  ContentPlanProps,
  UseContentPlanResult,
} from '../types/content-plan';
import { PostRow } from '../ui/post-row';

/** Логика контент-плана: публикации по срокам и открытая публикация */
export function useContentPlan({
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
