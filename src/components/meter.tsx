import type { SongStage } from '@/lib/model';
import { songProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';
import { LED_CLASS } from './status';

type Props = { stages: ReadonlyArray<Pick<SongStage, 'id' | 'status'>>; size?: 'sm' | 'lg' };

// Индикатор песни: по светодиоду на этап, как сегменты индикатора уровня на пульте.
export function Meter({ stages, size = 'sm' }: Props) {
  const p = songProgress(stages);
  return (
    <div
      role="img"
      aria-label={`Готово ${p.done} из ${p.total} этапов`}
      className={cn('flex w-full', size === 'sm' ? 'gap-0.5' : 'gap-1')}
    >
      {stages.map((s) => (
        <span
          key={s.id}
          className={cn(
            'min-w-0 flex-1 rounded-[3px] transition-colors duration-300',
            size === 'sm' ? 'h-1.5' : 'h-2.5',
            LED_CLASS[s.status],
          )}
        />
      ))}
    </div>
  );
}
