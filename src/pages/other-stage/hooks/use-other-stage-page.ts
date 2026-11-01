import { useState } from 'react';
import { toast } from 'sonner';
import { otherStagesQuery, updateOtherStage } from '@/entities/other';
import { ProjectDirection, useAccess } from '@/entities/project';
import type { StagePatch } from '@/entities/song';
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
import type { UseOtherStagePageResult } from '../types/stage';

/** Этап раздела Другое, его правка и удаление */
export function useOtherStagePage(): UseOtherStagePageResult {
  const { projectId, stageId } = useParams({
    from: '/app/p/$projectId/other/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery(otherStagesQuery(projectId));
  const crumbs = useProjectCrumbs(projectId, ProjectDirection.other);
  const access = useAccess(projectId);
  const [isConfirming, setIsConfirming] = useState(false);
  const stages = query.data ?? [];
  const index = stages.findIndex((stage) => stage.id === stageId);
  const position = index + 1;

  const handleSave = (patch: StagePatch): void => {
    void updateOtherStage(client, stageId, patch).catch(() => {
      toast.error(SAVE_FAILED);
    });
  };

  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.OtherStages).delete(stageId),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({
        to: '/p/$projectId/other',
        params: { projectId },
      });
      await client.invalidateQueries({ queryKey: queryKeys.otherStages.all });
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
    crumbs,
    canEdit: access.canEdit,
    canWork: access.canWork,
    isPending: query.isPending,
    stage: stages[index],
    positionLabel: `Этап ${position} из ${stages.length}`,
    notesScope: { project: projectId, other: true, other_stage: stageId },
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  };
}
