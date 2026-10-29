import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SectionButton } from '@/components/page';
import type { Song } from '@/lib/model';
import { pb } from '@/lib/pb';
import { promoQuery } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';

// Промо-план песни: набор публикаций из настроек проекта, вокруг релиза, одной кнопкой. Пустой
// набор - кнопки нет.
export function PromoButton({ song, meId }: { song: Song; meId: string }) {
  const client = useQueryClient();
  const promo = useQuery(promoQuery(song.project));
  const steps = promo.data ?? [];
  const make = useMutation({
    mutationFn: async () => {
      const batch = pb.createBatch();
      for (const p of steps) {
        batch.collection('posts').create({
          project: song.project,
          song: song.id,
          title: p.title,
          text: p.comment ?? '',
          author: meId,
          status: 'idea',
          anchor: 'release',
          offset: p.offset,
          platforms: p.platforms ?? [],
          assignees: [],
        });
      }
      await batch.send();
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.posts.ofProject(song.project) }),
    onError: () => toast.error('Промо-план не создан: проверьте соединение'),
  });
  if (steps.length === 0) return null;
  return (
    <SectionButton icon={<Sparkles />} disabled={make.isPending} onClick={() => make.mutate()}>
      Добавить промо-план
    </SectionButton>
  );
}
