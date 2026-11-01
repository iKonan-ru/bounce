import { useState } from 'react';
import { toast } from 'sonner';
import {
  ProjectDirection,
  useAccess,
  getPeopleById,
  useProjectPeople,
} from '@/entities/project';
import { songsQuery } from '@/entities/song';
import { reorderVideoStages, videoQuery } from '@/entities/video';
import type { VideoPatch } from '@/entities/video';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
  sendRecordForm,
} from '@/shared/api';
import { useImageUpload } from '@/shared/hooks';
import { getNextPosition, moveItemById } from '@/shared/utils';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

/** Карточка, ее этапы и явное применение шаблона */
export function useVideoPage(projectId: string, videoId: string) {
  const query = useQuery(videoQuery(videoId));
  const access = useAccess(projectId);
  const songs = useQuery({
    ...songsQuery(projectId),
    enabled: Boolean(query.data?.song),
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const crumbs = useProjectCrumbs(projectId, ProjectDirection.video);
  const people = getPeopleById(useProjectPeople(projectId));
  const [isConfirming, setIsConfirming] = useState(false);
  const video = query.data?.project === projectId ? query.data : undefined;
  const stages = (video?.expand?.video_stages_via_video ?? []).toSorted(
    (a, b) => a.position - b.position
  );
  const refresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.videos.all });
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Изменения не сохранены'));
  };
  const save = useMutation({
    scope: { id: `video:${videoId}` },
    mutationFn: (patch: VideoPatch) =>
      getCollection(pb, Collections.Videos).update(videoId, patch),
    onSuccess: refresh,
    onError,
  });
  const onSave = async (patch: VideoPatch): Promise<void> => {
    await save.mutateAsync(patch);
  };
  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.VideoStages).create({
        video: videoId,
        title,
        status: 'not_started',
        position: getNextPosition(stages),
        substeps: [],
      }),
    onSuccess: refresh,
    onError,
  });
  const apply = useMutation({
    mutationFn: (preset: string) =>
      pb.send(`/api/bounce/videos/${videoId}/template`, {
        method: 'POST',
        body: { preset },
      }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => getCollection(pb, Collections.Videos).delete(videoId),
    onSuccess: async () => {
      await refresh();
      await navigate({ to: '/p/$projectId/videos', params: { projectId } });
    },
    onError,
  });
  const cover = useImageUpload(async (file, onProgress) => {
    const form = new FormData();
    form.set('preview', file);
    await sendRecordForm(Collections.Videos, form, { id: videoId, onProgress });
    await refresh();
  }, 'Превью не загрузилось');
  const onRemovePreview = (): void => {
    void getCollection(pb, Collections.Videos)
      .update(videoId, { preview: '' })
      .then(refresh)
      .catch(onError);
  };
  const onDelete = (): void => setIsConfirming(true);
  const onDeleteConfirm = (): void => remove.mutate();
  const onStageAdd = (title: string): Promise<unknown> =>
    add.mutateAsync(title);
  const onTemplate = (preset: string): void => apply.mutate(preset);
  const onReorder = (from: string, to: string): void => {
    void reorderVideoStages(
      client,
      videoId,
      moveItemById(stages, from, to)
    ).catch(onError);
  };

  return {
    projectId,
    videoId,
    linkedSongTitle:
      songs.data?.find((song) => song.id === video?.song)?.title ?? 'Песня',
    video,
    stages,
    crumbs,
    canEdit: access.canEdit,
    isPending: query.isPending,
    people,
    shouldRedirect: Boolean(access.role) && !access.canEdit,
    isConfirming,
    setIsConfirming,
    isSaving: save.isPending,
    isRemoving: remove.isPending,
    isAdding: add.isPending,
    isApplying: apply.isPending,
    cover,
    onRemovePreview,
    onSave,
    onDelete,
    onDeleteConfirm,
    onStageAdd,
    onTemplate,
    onReorder,
  };
}
