import type { MeterSize } from './sizes';
import type { SongStage } from './song';

/** Пропсы индикатора песни */
export interface MeterProps {
  stages: readonly Pick<SongStage, 'id' | 'status'>[];
  size?: MeterSize;
}
