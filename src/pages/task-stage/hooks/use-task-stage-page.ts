import { useState } from 'react';
import { toast } from 'sonner';
import { ProjectDirection, useAccess } from '@/entities/project';
import { taskStagesQuery, updateTaskStage } from '@/entities/project-task';
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
import type { UseTaskStagePageResult } from '../types/stage';

/** Этап раздела Задачи, его правка и удаление */
export function useTaskStagePage(): UseTaskStagePageResult {
  const { projectId, stageId } = useParams({
    from: '/app/p/$projectId/tasks/stages/$stageId',
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery(taskStagesQuery(projectId));
  const crumbs = useProjectCrumbs(projectId, ProjectDirection.other);
  const access = useAccess(projectId);
  const [isConfirming, setIsConfirming] = useState(false);
  const allStages = query.data ?? [];
  const currentStage = allStages.find((stage) => stage.id === stageId);
  const task = currentStage?.expand?.project_task;
  const stages = allStages.filter(
    (stage) => stage.project_task === currentStage?.project_task
  );

  if (task) {
    crumbs.push({
      label: task.title,
      link: {
        to: '/p/$projectId/tasks/$taskId',
        params: { projectId, taskId: task.id },
      },
    });
  }

  const index = stages.findIndex((stage) => stage.id === stageId);
  const position = index + 1;

  const handleSave = (patch: StagePatch): void => {
    void updateTaskStage(client, stageId, patch).catch(() => {
      toast.error(SAVE_FAILED);
    });
  };

  const remove = useMutation({
    mutationFn: (): Promise<boolean> =>
      getCollection(pb, Collections.OtherStages).delete(stageId),
    onSuccess: async () => {
      setIsConfirming(false);
      await navigate({
        to: '/p/$projectId/tasks/$taskId',
        params: { projectId, taskId: currentStage?.project_task ?? '' },
      });
      await client.invalidateQueries({ queryKey: queryKeys.taskStages.all });
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
    notesScope: {
      project: projectId,
      other: true,
      other_stage: stageId,
      project_task: currentStage?.project_task ?? '',
    },
    isConfirming,
    setIsConfirming,
    isRemoving: remove.isPending,
    handleSave,
    onTitleSave,
    onDeleteClick,
    onDeleteConfirm,
  };
}
