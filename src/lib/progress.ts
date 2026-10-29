import { comparePositions } from '@/shared/utils';
import { StageStatus } from './model';
import { CLOSED_STAGE_STATUSES } from './statuses';

/** Сто процентов */
const FULL_PERCENT = 100;

/** Прогресс песни по этапам */
export interface Progress {
  done: number;
  total: number;
  percent: number;
}

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
