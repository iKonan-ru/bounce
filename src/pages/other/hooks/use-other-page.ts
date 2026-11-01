import { toast } from 'sonner';
import { otherStagesQuery } from '@/entities/other';
import {
  projectQuery,
  ProjectDirection,
  useAccess,
  getPeopleById,
  useProjectPeople,
} from '@/entities/project';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
  savePositions,
} from '@/shared/api';
import { getNextPosition, moveItemById } from '@/shared/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Этапы прямо в разделе проекта */
export function useOtherPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/other' });
  const project = useQuery(projectQuery(projectId));
  const query = useQuery(otherStagesQuery(projectId));
  const access = useAccess(projectId);
  const client = useQueryClient();
  const people = getPeopleById(useProjectPeople(projectId));
  const stages = query.data ?? [];
  const refresh = (): Promise<void> =>
    client.invalidateQueries({ queryKey: queryKeys.otherStages.all });
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Изменения не сохранены'));
  };
  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.OtherStages).create({
        project: projectId,
        title,
        status: 'not_started',
        position: getNextPosition(stages),
        substeps: [],
      }),
    onSuccess: refresh,
    onError,
  });
  const onStageAdd = (title: string): Promise<unknown> =>
    add.mutateAsync(title);
  const onReorder = (from: string, to: string): void => {
    void savePositions(
      pb,
      Collections.OtherStages,
      moveItemById(stages, from, to)
    )
      .then(refresh)
      .catch(onError);
  };

  return {
    projectId,
    stages,
    people,
    canEdit: access.canEdit,
    isEnabled: project.data?.directions.includes(ProjectDirection.other),
    isPending: query.isPending || project.isPending,
    isError: query.isError || project.isError,
    isAdding: add.isPending,
    onStageAdd,
    onReorder,
  };
}
