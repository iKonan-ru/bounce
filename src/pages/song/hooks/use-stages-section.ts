import { toast } from 'sonner';
import { getPeopleById, useProjectPeople } from '@/entities/project';
import {
  getSongProgress,
  templatesQuery,
  createStagesFromTemplate,
  StageStatus,
  reorderStages,
} from '@/entities/song';
import { pb, queryKeys, getCollection, Collections } from '@/shared/api';
import { getNextPosition, moveItemById } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type { StagesSectionProps, UseStagesSectionResult } from '../types/song';

/** Этапы песни: добавление, этапы из шаблона и порядок */
export function useStagesSection({
  projectId,
  songId,
  stages,
  canEdit,
}: StagesSectionProps): UseStagesSectionResult {
  const people = getPeopleById(useProjectPeople(projectId));
  const client = useQueryClient();
  const progress = getSongProgress(stages);
  const hasStages = stages.length > 0;
  // у песни нет этапов - их можно взять из шаблона проекта одной кнопкой
  const shouldLoadTemplates = canEdit && !hasStages;
  const templates = useQuery({
    ...templatesQuery(projectId),
    enabled: shouldLoadTemplates,
  });
  const templateList = templates.data ?? [];

  const fromTemplate = useMutation({
    mutationFn: (): Promise<unknown> =>
      createStagesFromTemplate(pb, songId, templateList),
    onSuccess: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Этапы не добавлены: проверьте соединение');
    },
  });

  const add = useMutation({
    mutationFn: (title: string): Promise<unknown> =>
      getCollection(pb, Collections.SongStages).create({
        song: songId,
        title,
        position: getNextPosition(stages),
        status: StageStatus.not_started,
        substeps: [],
      }),
    onSuccess: (): Promise<void> =>
      client.invalidateQueries({ queryKey: queryKeys.songs.all }),
    onError: () => {
      toast.error('Этап не добавлен: проверьте соединение');
    },
  });

  const onStagesReorder = (from: string, to: string): void => {
    void reorderStages(client, songId, moveItemById(stages, from, to)).catch(
      () => {
        toast.error('Порядок не сохранился: проверьте соединение');
      }
    );
  };

  const onFromTemplateClick = (): void => {
    fromTemplate.mutate();
  };

  const onStageAdd = (title: string): Promise<unknown> =>
    add.mutateAsync(title);

  const hasTemplates = templateList.length > 0;
  const canAddFromTemplate = canEdit && hasTemplates;

  return {
    people,
    doneCount: progress.done,
    totalCount: progress.total,
    canAddFromTemplate,
    isAddingFromTemplate: fromTemplate.isPending,
    isAdding: add.isPending,
    onFromTemplateClick,
    onStageAdd,
    onStagesReorder,
  };
}
