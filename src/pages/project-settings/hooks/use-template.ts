import { useState } from 'react';
import { toast } from 'sonner';
import type { StageTemplate } from '@/entities/song';
import { templatesQuery } from '@/entities/song';
import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  savePositions,
} from '@/shared/api';
import { getNextPosition, moveItemById } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type { UseTemplateResult } from '../types/project-settings';

/** Этапы шаблона: добавление, порядок и раскрытая строка */
export function useTemplate(projectId: string): UseTemplateResult {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery(projectId));
  const [openTemplateId, setOpenTemplateId] = useState<string>();
  const templateList = templates.data ?? [];
  const templatesKey = templatesQuery(projectId).queryKey;
  const hasTemplates = templateList.length > 0;
  const isEmpty = templates.isSuccess && !hasTemplates;

  const refreshTemplates = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stageTemplates.all });

  const addTemplate = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.StageTemplates).create({
        project: projectId,
        title,
        position: getNextPosition(templateList),
        substeps: [],
      }),
    onSuccess: refreshTemplates,
    onError: () => toast.error('Этап не добавлен: проверьте соединение'),
  });

  const onTemplatesReorder = (from: string, to: string): void => {
    const ordered = moveItemById(templateList, from, to);
    queryClient.setQueryData<StageTemplate[]>(
      templatesKey,
      ordered.map((template, index) => ({ ...template, position: index }))
    );
    void savePositions(pb, Collections.StageTemplates, ordered)
      .catch(() => toast.error('Порядок не сохранился: проверьте соединение'))
      .finally(refreshTemplates);
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
