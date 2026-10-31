import { useState } from 'react';
import { toast } from 'sonner';
import { ProjectDirection, useAccess } from '@/entities/project';
import type { StagePatch } from '@/entities/song';
import { videoQuery, updateVideoStage } from '@/entities/video';
import {
  getCollection,
  pb,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import type { UseVideoStagePageResult } from '../types/stage';

/** Этап видео, его правка и удаление */
export function useVideoStagePage(): UseVideoStagePageResult {
  const { projectId, videoId, stageId } = useParams({
    from: '/app/p/$projectId/videos/$videoId/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const video = useQuery(videoQuery(videoId));
  const crumbs = useProjectCrumbs(projectId, ProjectDirection.video);
  const access = useAccess(projectId);
  const [isConfirming, setIsConfirming] = useState(false);
  const stages = (
    video.data?.project === projectId
      ? (video.data.expand?.video_stages_via_video ?? [])
      : []
  ).toSorted((a, b) => a.position - b.position);
  const index = stages.findIndex((videoStage) => videoStage.id === stageId);
  const position = index + 1;

  const handleSave = (patch: StagePatch): void => {
    void updateVideoStage(client, stageId, patch).catch(() => {
      toast.error(SAVE_FAILED);
    });
  };

  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.VideoStages).delete(stageId),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({
        to: '/p/$projectId/videos/$videoId',
        params: { projectId, videoId },
      });
      await client.invalidateQueries({ queryKey: queryKeys.videos.all });
    },
    onError: (error) => {
      toast.error(getErrorText(error, 'Этап не удален'));
    },
  });

  const onTitleSave = (title: string): void => {
    handleSave({ title });
  };

  const onDeleteClick = (): void => {
    setIsConfirming(true);
  };

  const onDeleteConfirm = (): void => {
    remove.mutate();
  };

  return {
    projectId,
    crumbs: [
      ...crumbs,
      {
        label: video.data?.title ?? 'Видео',
        link: {
          to: '/p/$projectId/videos/$videoId',
          params: { projectId, videoId },
        },
      },
    ],
    canEdit: access.canEdit,
    canWork: access.canWork,
    isPending: video.isPending,
    stage: stages[index],
    positionLabel: `Этап ${position} из ${stages.length}`,
    notesScope: { project: projectId, video: videoId, video_stage: stageId },
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  };
}
