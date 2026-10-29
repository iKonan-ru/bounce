import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { SectionButton } from '@/components/page';
import { PostAnchor, PostStatus, type Song } from '@/lib/model';
import { Collections, pb } from '@/lib/pb';
import { promoQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Пропсы кнопки промо-плана */
interface PromoButtonProps {
  song: Song;
  meId: string;
}

/** Состояние и обработчик кнопки промо-плана */
interface UsePromoButtonResult {
  /** В настройках проекта есть набор публикаций */
  hasSteps: boolean;
  isBusy: boolean;
  onAddClick: () => void;
}

/** Логика промо-плана: набор публикаций проекта и их создание одним запросом */
function usePromoButton({
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

/**
 * Промо-план песни: набор публикаций из настроек проекта, вокруг релиза, одной кнопкой
 *
 * Пустой набор - кнопки нет
 */
export function PromoButton({ song, meId }: PromoButtonProps): ReactNode {
  const { hasSteps, isBusy, onAddClick } = usePromoButton({ song, meId });

  if (!hasSteps) {
    return null;
  }

  const sparklesIcon = <Sparkles />;

  return (
    <SectionButton icon={sparklesIcon} disabled={isBusy} onClick={onAddClick}>
      Добавить промо-план
    </SectionButton>
  );
}
