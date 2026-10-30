import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Post } from '@/entities/post';
import { postsQuery, groupPosts, getPostDate } from '@/entities/post';
import { songsQuery } from '@/entities/song';
import { BUCKETS } from '@/shared/constants';
import { ContentDirection } from '@/shared/types';
import { useQuery } from '@tanstack/react-query';
import type { ContentPlanProps, ContentPlanItem } from '../types/content-plan';
import { PostRow } from '../ui/post-row';
import { VideoPostRow } from '../ui/video-post-row';
import { useVideoPublications } from './use-video-publications';

/** Единый список по срокам: обе карточки открывают исходную запись */
export function useContentPlan({
  projectId,
  assigneeId,
  direction = ContentDirection.All,
}: ContentPlanProps) {
  const video = useVideoPublications({ projectId, assigneeId });
  const showMusic =
    direction === ContentDirection.All || direction === ContentDirection.Music;
  const showVideo =
    direction === ContentDirection.All || direction === ContentDirection.Video;
  const songs = useQuery({
    ...songsQuery(projectId),
    enabled: video.isReleaseEnabled,
  });
  const posts = useQuery({
    ...postsQuery(projectId),
    enabled: video.isReleaseEnabled,
  });
  const [openId, setOpenId] = useState<string>();
  const songList = songs.data ?? [];
  const music = groupPosts(
    video.isReleaseEnabled && showMusic ? (posts.data ?? []) : [],
    songList,
    new Date(),
    assigneeId
  );
  const getDate = (item: ContentPlanItem): string =>
    (item.kind === 'music'
      ? getPostDate(item.post, songList)
      : item.post.scheduled_at) || '9999';
  const compare = (a: ContentPlanItem, b: ContentPlanItem): number =>
    getDate(a).localeCompare(getDate(b));
  const groups = BUCKETS.map((bucket) => {
    const musicRows: ContentPlanItem[] = (
      music.groups.find((group) => group.bucket === bucket)?.items ?? []
    ).map((post) => ({ id: `music:${post.id}`, kind: 'music', post }));
    const videoRows: ContentPlanItem[] = (
      (showVideo ? video.groups : []).find((group) => group.bucket === bucket)
        ?.items ?? []
    ).map((post) => ({ id: `video:${post.id}`, kind: 'video', post }));

    return { bucket, items: [...musicRows, ...videoRows].sort(compare) };
  }).filter((group) => group.items.length);
  const published: ContentPlanItem[] = [
    ...music.published.map((post): ContentPlanItem => ({
      id: `music:${post.id}`,
      kind: 'music',
      post,
    })),
    ...(showVideo ? video.published : []).map((post): ContentPlanItem => ({
      id: `video:${post.id}`,
      kind: 'video',
      post,
    })),
  ];
  published.sort((a, b) => compare(b, a));
  const openedPost = posts.data?.find((post) => post.id === openId);
  const isLoading =
    (video.isReleaseEnabled && (posts.isPending || songs.isPending)) ||
    (video.isVideoEnabled && video.isPending);
  const showEmpty =
    !isLoading &&
    (!video.isVideoEnabled || !video.isError) &&
    (!video.isReleaseEnabled || !posts.isError) &&
    groups.length === 0 &&
    published.length === 0;
  const emptyText = assigneeId ? 'На вас пока ничего' : 'Публикаций пока нет';
  const renderPost = (item: ContentPlanItem): ReactNode => {
    if (item.kind === 'video') {
      return (
        <VideoPostRow
          post={item.post}
          accountName={video.accountName(item.post)}
          videoTitle={video.videoTitle(item.post)}
          onOpen={video.onOpen}
        />
      );
    }

    const onOpen = (): void => setOpenId(item.post.id);

    return <PostRow post={item.post} songs={songList} onOpen={onOpen} />;
  };
  const onPostCreated = (post: Post): void => setOpenId(post.id);
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
    video,
    showMusic,
    showVideo,
  };
}
