import { useState } from 'react';
import { toast } from 'sonner';
import { projectQuery, useAccess, ProjectDirection } from '@/entities/project';
import { videosQuery } from '@/entities/video';
import { videoPostsQuery, getPublicationDay } from '@/entities/video-post';
import type { VideoPost } from '@/entities/video-post';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { BUCKETS } from '@/shared/constants';
import { getBucket } from '@/shared/utils';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
  const client = useQueryClient();
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
  const refresh = (): Promise<unknown[]> =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.videoPosts.all }),
      client.invalidateQueries({ queryKey: queryKeys.videos.all }),
    ]);
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Изменения не сохранены'));
  };
  const saveMain = useMutation({
    mutationFn: (main_publication: string) =>
      getCollection(pb, Collections.Videos).update(video?.id ?? '', {
        main_publication,
      }),
    onSuccess: refresh,
    onError,
  });
  const promo = useMutation({
    mutationFn: () =>
      pb.send<{ added: number }>(
        `/api/bounce/videos/${video?.id ?? ''}/promo`,
        { method: 'POST' }
      ),
    onSuccess: async (result) => {
      await refresh();

      if (!result.added) {
        toast('Промо-план уже добавлен');
      }
    },
    onError,
  });
  const onMainChange = (id: string): void => saveMain.mutate(id);
  const onPromo = (): void => promo.mutate();
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
    onPromo,
    onMainChange,
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
    isBusy: promo.isPending || saveMain.isPending,
    groups,
    published,
    mainOptions: [
      { value: '', label: 'Не выбрана' },
      ...list
        .filter((post) => post.anchor === 'date')
        .map((post) => ({ value: post.id, label: post.title })),
    ],
  };
}
