import type { ReactNode } from 'react';
import type { SongStage } from '@/lib/model';
import { getSongProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';
import { LED_CLASS } from './status';

/** Размер индикатора песни */
export enum MeterSize {
  Small = 'sm',
  Large = 'lg',
}

/** Пропсы индикатора песни */
interface MeterProps {
  stages: readonly Pick<SongStage, 'id' | 'status'>[];
  /** Размер; принимает и запись MeterSize, и её строку, пока вызывающие передают строку */
  size?: MeterSize;
}

/** Индикатор песни: по светодиоду на этап, как сегменты индикатора уровня на пульте */
export function Meter({ stages, size = MeterSize.Small }: MeterProps): ReactNode {
  const progress = getSongProgress(stages);
  const isSmall = size === MeterSize.Small;
  const progressLabel = `Готово ${progress.done} из ${progress.total} этапов`;
  const meterClassName = cn('flex w-full', { 'gap-0.5': isSmall, 'gap-1': !isSmall });
  return (
    <div role="img" aria-label={progressLabel} className={meterClassName}>
      {stages.map((stage) => {
        const ledClassName = cn(
          'min-w-0 flex-1 rounded-[3px] transition-colors duration-300',
          { 'h-1.5': isSmall, 'h-2.5': !isSmall },
          LED_CLASS[stage.status],
        );
        return <span key={stage.id} className={ledClassName} />;
      })}
    </div>
  );
}
