import { useState } from 'react';
import { toast } from 'sonner';
import type { PromoStep } from '@/entities/post';
import { promoQuery } from '@/entities/post';
import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type {
  PromoStepUpdate,
  UsePromoTemplateResult,
  PromoStepPatch,
} from '../types/promo-template';

/** Публикации по сдвигу от релиза: сначала самые ранние */
function compareStepsByOffset(first: PromoStep, second: PromoStep): number {
  return (first.offset ?? 0) - (second.offset ?? 0);
}

/** Публикации с правкой; правка видна сразу, не дожидаясь сервера */
function applyStepUpdate(
  steps: PromoStep[] | undefined,
  { id, patch }: PromoStepUpdate
): PromoStep[] | undefined {
  if (!steps) {
    return steps;
  }

  return steps.map((step) => {
    if (step.id !== id) {
      return step;
    }

    return { ...step, ...patch };
  });
}

/** Публикации промо-плана: загрузка, добавление, правка и удаление */
export function usePromoTemplate(
  projectId: string,
  canEdit: boolean
): UsePromoTemplateResult {
  const client = useQueryClient();
  const queryKey = promoQuery(projectId).queryKey;
  const stepsQuery = useQuery(promoQuery(projectId));
  const [openId, setOpenId] = useState<string>();
  const refreshSteps = (): Promise<void> =>
    client.invalidateQueries({
      queryKey: queryKeys.promo.ofProject(projectId),
    });

  const add = useMutation({
    mutationFn: (title: string) =>
      getCollection(pb, Collections.PromoTemplates).create<PromoStep>({
        project: projectId,
        title,
        offset: 0,
        platforms: [],
      }),
    onSuccess: async (step) => {
      await refreshSteps();
      setOpenId(step.id);
    },
    onError: () => toast.error(SAVE_FAILED),
  });
  const save = useMutation({
    mutationFn: ({ id, patch }: PromoStepUpdate) =>
      getCollection(pb, Collections.PromoTemplates).update(id, patch),
    // выбор виден сразу, не дожидаясь сервера
    onMutate: (update) => {
      client.setQueryData<PromoStep[]>(queryKey, (old) =>
        applyStepUpdate(old, update)
      );
    },
    onSettled: refreshSteps,
    onError: () => toast.error(SAVE_FAILED),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      getCollection(pb, Collections.PromoTemplates).delete(id),
    onSuccess: refreshSteps,
    onError: () => toast.error('Не удалилось: проверьте соединение'),
  });

  const loadedSteps = stepsQuery.data ?? [];
  const sortedSteps = [...loadedSteps].sort(compareStepsByOffset);
  const isEmpty = sortedSteps.length === 0;
  const showEmpty = [stepsQuery.isSuccess, isEmpty, !canEdit].every(Boolean);

  const onStepToggle = (id: string): void => {
    const nextOpenId = openId === id ? undefined : id;
    setOpenId(nextOpenId);
  };
  const onStepSave = (id: string, patch: PromoStepPatch): void => {
    save.mutate({ id, patch });
  };
  const onStepRemove = (id: string): void => {
    remove.mutate(id);
  };
  const onStepAdd = (title: string): Promise<PromoStep> =>
    add.mutateAsync(title);

  return {
    steps: sortedSteps,
    showEmpty,
    openId,
    isAdding: add.isPending,
    onStepToggle,
    onStepSave,
    onStepRemove,
    onStepAdd,
  };
}
