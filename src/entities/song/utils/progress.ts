import { comparePositions } from '@/shared/utils';
import { FULL_PERCENT } from '../constants/progress';
import { CLOSED_STAGE_STATUSES } from '../constants/statuses';
import type { Progress } from '../types/progress';
import { StageStatus } from '../types/song';

/** Прогресс песни = готовые этапы / (все этапы - пропущенные) */
export function getSongProgress(
  stages: readonly { status: StageStatus }[]
): Progress {
  const countedStages = stages.filter(
    (stage) => stage.status !== StageStatus.skipped
  );
  const done = countedStages.filter(
    (stage) => stage.status === StageStatus.done
  ).length;
  const total = countedStages.length;

  if (total === 0) {
    return { done, total, percent: 0 };
  }

  return { done, total, percent: Math.round((done / total) * FULL_PERCENT) };
}

/** Этап, на котором песня сейчас: первый не готовый и не пропущенный */
export function getCurrentStage<
  Stage extends { status: StageStatus; position: number },
>(stages: readonly Stage[]): Stage | undefined {
  return [...stages]
    .sort(comparePositions)
    .find((stage) => !CLOSED_STAGE_STATUSES.has(stage.status));
}
