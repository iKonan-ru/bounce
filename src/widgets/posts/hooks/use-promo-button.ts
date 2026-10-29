import { toast } from 'sonner';
import { promoQuery, PostStatus, PostAnchor } from '@/entities/post';
import { pb, Collections, queryKeys } from '@/shared/api';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import type {
  PromoButtonProps,
  UsePromoButtonResult,
} from '../types/promo-button';

/** Логика промо-плана: набор публикаций проекта и их создание одним запросом */
export function usePromoButton({
  song,
  meId,
}: PromoButtonProps): UsePromoButtonResult {
  const client = useQueryClient();
  const promo = useQuery(promoQuery(song.project));
  const steps = promo.data ?? [];
  const make = useMutation({
    mutationFn: async () => {
      const batch = pb.createBatch();
      for (const step of steps) {
        batch.collection(Collections.Posts).create({
          project: song.project,
          song: song.id,
          title: step.title,
          text: step.comment ?? '',
          author: meId,
          status: PostStatus.idea,
          anchor: PostAnchor.release,
          offset: step.offset,
          platforms: step.platforms ?? [],
          assignees: [],
        });
      }
      await batch.send();
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: queryKeys.posts.ofProject(song.project),
      }),
    onError: () => {
      toast.error('Промо-план не создан: проверьте соединение');
    },
  });
  const onAddClick = (): void => {
    make.mutate();
  };

  return { hasSteps: steps.length > 0, isBusy: make.isPending, onAddClick };
}
