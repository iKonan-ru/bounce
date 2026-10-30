import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  pb,
  getCollection,
  Collections,
  queryKeys,
  getErrorText,
} from '@/shared/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PromoDialogProps } from '../types/publishing';
import { usePublicationFields } from './use-publication-fields';

/** Видеопромо сохраняется отдельно от музыкального шаблона */
export function usePromoDialog({
  projectId,
  template,
  canEdit,
  onClose,
}: PromoDialogProps) {
  const state = usePublicationFields(projectId, template);
  const client = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const onSuccess = async (): Promise<void> => {
    await client.invalidateQueries({
      queryKey: queryKeys.videoPromo.ofProject(projectId),
    });
    await client.invalidateQueries({
      queryKey: queryKeys.projects.directions(projectId),
    });
    onClose();
  };
  const onError = (error: unknown): void => {
    toast.error(getErrorText(error, 'Промо-план не сохранен'));
  };
  const save = useMutation({
    mutationFn: () => {
      const { text, ...fields } = state.fields;
      const body = {
        ...fields,
        title: fields.title.trim(),
        comment: text,
        direction: 'video',
        platforms: [],
      };
      const collection = getCollection(pb, Collections.PromoTemplates);

      return template
        ? collection.update(template.id, body)
        : collection.create({ ...body, project: projectId });
    },
    onSuccess,
    onError,
  });
  const remove = useMutation({
    mutationFn: () =>
      getCollection(pb, Collections.PromoTemplates).delete(template?.id ?? ''),
    onSuccess,
    onError,
  });
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (state.canSave && canEdit && !save.isPending) {
      save.mutate();
    }
  };
  const onRemove = (): void => setIsConfirming(true);
  const onRemoveConfirm = (): void => remove.mutate();

  return {
    ...state,
    isBusy: save.isPending || remove.isPending,
    isConfirming,
    setIsConfirming,
    onSubmit,
    onRemove,
    onRemoveConfirm,
  };
}
