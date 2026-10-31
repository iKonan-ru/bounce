import { useState } from 'react';
import { projectQuery, useAccess, ProjectDirection } from '@/entities/project';
import { videosQuery } from '@/entities/video';
import { videoPostsQuery, getPublicationDay } from '@/entities/video-post';
import type { VideoPost } from '@/entities/video-post';
import { BUCKETS } from '@/shared/constants';
import { getBucket } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';
import type { VideoPublicationsProps } from '../types/publishing';

/** Карточка и контент-план используют одни запросы и действия */
export function useVideoPublications({
  projectId,
  video,
  assigneeId,
}: VideoPublicationsProps) {
  const access = useAccess(projectId);
  const query = useQuery({
    ...videoPostsQuery(projectId),
    enabled: access.isVideoEnabled,
  });
  const videos = useQuery({
    ...videosQuery(projectId),
    enabled: access.isVideoEnabled,
  });
  const project = useQuery(projectQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const list = (query.data ?? [])
    .filter(
      (post) =>
        (!video || post.video === video.id) &&
        (!assigneeId || post.assignees === assigneeId)
    )
    .toSorted((a, b) =>
      (a.scheduled_at || '9999').localeCompare(b.scheduled_at || '9999')
    );
  const openedPost = list.find((post) => post.id === openId);
  const onCreate = (): void => setOpenId('new');
  const onClose = (): void => setOpenId(undefined);
  const canCreate =
    access.canWork &&
    (project.data?.links ?? []).some((link) =>
      link.directions.includes(ProjectDirection.video)
    );
  const accountName = (post: VideoPost): string =>
    project.data?.links?.find((link) => link.id === post.account)?.name ??
    'Аккаунт';
  const videoTitle = (post: VideoPost): string =>
    videos.data?.find((item) => item.id === post.video)?.title ?? 'Видео';
  const published = list.filter((post) => post.status === 'published');
  const groups = BUCKETS.map((bucket) => ({
    bucket,
    items: list.filter(
      (post) =>
        post.status !== 'published' &&
        getBucket(getPublicationDay(post), new Date()) === bucket
    ),
  })).filter((group) => group.items.length);

  return {
    list,
    openedPost,
    openId,
    onOpen: setOpenId,
    onCreate,
    onClose,
    accountName,
    videoTitle,
    canWork: access.canWork,
    isReleaseEnabled: access.isReleaseEnabled,
    isVideoEnabled: access.isVideoEnabled,
    isOwner: access.canManage,
    canEdit: access.canEdit,
    canCreate,
    isPending: query.isPending,
    isError: query.isError,
    groups,
    published,
  };
}
