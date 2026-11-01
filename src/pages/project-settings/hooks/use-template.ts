import { useState } from 'react';
import { toast } from 'sonner';
import { ProjectDirection } from '@/entities/project';
import type { StageTemplate } from '@/entities/song';
import { templatesQuery } from '@/entities/song';
import {
  queryKeys,
  applyOptimisticEdit,
  getCollection,
  pb,
  Collections,
  savePositions,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import {
  comparePositions,
  getNextPosition,
  moveItemById,
} from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type { UseTemplateResult } from '../types/project-settings';

/** Этапы шаблона: добавление, порядок и раскрытая строка */
export function useTemplate(
  projectId: string,
  direction: ProjectDirection = ProjectDirection.music
): UseTemplateResult {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery(projectId, direction));
  const [openTemplateId, setOpenTemplateId] = useState<string>();
  const templateList = templates.data ?? [];
  const templatesKey = templatesQuery(projectId, direction).queryKey;
  const hasTemplates = templateList.length > 0;
  const isEmpty = templates.isSuccess && !hasTemplates;

  const refreshTemplates = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stageTemplates.all });

  const addTemplate = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.StageTemplates).create({
        project: projectId,
        direction,
        title,
        position: getNextPosition(templateList),
        substeps: [],
      }),
    onSuccess: refreshTemplates,
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  const onTemplatesReorder = (from: string, to: string): void => {
    const ordered = moveItemById(templateList, from, to);
    const positionById = new Map(
      ordered.map((template, index): [string, number] => [template.id, index])
    );
    // только позиции: применяется и поверх свежих данных с сервера (shared/api/optimistic.ts)
    void applyOptimisticEdit(
      queryClient,
      QueryRoot.StageTemplates,
      () =>
        queryClient.setQueryData<StageTemplate[]>(templatesKey, (cached) =>
          cached
            ?.map((template) => ({
              ...template,
              position: positionById.get(template.id) ?? template.position,
            }))
            .toSorted(comparePositions)
        ),
      () => savePositions(pb, Collections.StageTemplates, ordered)
    ).catch(() => toast.error('Порядок не сохранился: проверьте соединение'));
  };

  const onTemplateAdd = (title: string): Promise<unknown> =>
    addTemplate.mutateAsync(title);

  const handleTemplateToggle = (templateId: string): void => {
    if (openTemplateId === templateId) {
      setOpenTemplateId(undefined);

      return;
    }

    setOpenTemplateId(templateId);
  };

  return {
    templates,
    templateList,
    openTemplateId,
    isAdding: addTemplate.isPending,
    hasTemplates,
    isEmpty,
    onTemplatesReorder,
    onTemplateAdd,
    handleTemplateToggle,
  };
}
