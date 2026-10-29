import { useState } from 'react';
import { toast } from 'sonner';
import { useAccess } from '@/entities/project';
import type { StagePatch } from '@/entities/song';
import { songQuery, getOrderedStages, updateStage } from '@/entities/song';
import { getCollection, pb, Collections, queryKeys } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useSongCrumbs } from '@/widgets/page-crumbs';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import type { UseStagePageResult } from '../types/stage';

/** Этап песни, его правка и удаление */
export function useStagePage(): UseStagePageResult {
  const { projectId, songId, stageId } = useParams({
    from: '/app/p/$projectId/songs/$songId/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const song = useQuery(songQuery(songId));
  const crumbs = useSongCrumbs(projectId, songId);
  const access = useAccess(projectId);
  const [isConfirming, setIsConfirming] = useState(false);
  const stages = song.data ? getOrderedStages(song.data) : [];
  const index = stages.findIndex((songStage) => songStage.id === stageId);
  const position = index + 1;

  const handleSave = (patch: StagePatch): void => {
    void updateStage(client, songId, stageId, patch).catch(() => {
      toast.error(SAVE_FAILED);
    });
  };

  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.SongStages).delete(stageId),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({
        to: '/p/$projectId/songs/$songId',
        params: { projectId, songId },
      });
      await client.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
    onError: () => {
      toast.error('Этап не удалён: проверьте соединение');
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
    isPending: song.isPending,
    stage: stages[index],
    positionLabel: `Этап ${position} из ${stages.length}`,
    notesScope: { project: projectId, song: songId, stage: stageId },
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  };
}
