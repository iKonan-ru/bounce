import { useState } from 'react';
import { toast } from 'sonner';
import type { StageTemplate, TemplateSubstep } from '@/entities/song';
import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { UseTemplateRowResult } from '../types/project-settings';

/** Правка, подэтапы и удаление этапа шаблона */
export function useTemplateRow(
  template: StageTemplate,
  onToggle: (templateId: string) => void
): UseTemplateRowResult {
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const substeps = template.substeps ?? [];

  const refreshTemplates = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stageTemplates.all });

  const saveTemplate = useMutation({
    mutationFn: (patch: Partial<Pick<StageTemplate, 'title' | 'substeps'>>) =>
      getCollection(pb, Collections.StageTemplates).update(template.id, patch),
    onSettled: refreshTemplates,
    onError: () => toast.error(SAVE_FAILED),
  });
  const removeTemplate = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.StageTemplates).delete(template.id),
    onSuccess: refreshTemplates,
    onError: () => toast.error('Этап не удалён: проверьте соединение'),
  });

  const onToggleClick = (): void => {
    onToggle(template.id);
  };

  const onTitleSave = (title: string): void => {
    saveTemplate.mutate({ title });
  };

  const onSubstepsChange = (changed: readonly TemplateSubstep[]): void => {
    const nextSubsteps = changed.map((substep) => ({
      id: substep.id,
      title: substep.title,
    }));
    const replaceSubsteps = (cached: StageTemplate): StageTemplate => {
      if (cached.id !== template.id) {
        return cached;
      }

      return { ...cached, substeps: nextSubsteps };
    };
    queryClient.setQueryData<StageTemplate[]>(
      queryKeys.stageTemplates.ofProject(template.project),
      (cachedList) => cachedList?.map(replaceSubsteps)
    );
    saveTemplate.mutate({ substeps: nextSubsteps });
  };

  const onRemoveClick = (): void => {
    setIsConfirming(true);
  };

  const onRemoveConfirm = (): void => {
    removeTemplate.mutate();
  };

  return {
    substeps,
    isConfirming,
    setIsConfirming,
    isRemoving: removeTemplate.isPending,
    onToggleClick,
    onTitleSave,
    onSubstepsChange,
    onRemoveClick,
    onRemoveConfirm,
  };
}
