import type { StageStatus } from './model';

export type Progress = { done: number; total: number; percent: number };

// Прогресс песни = готовые этапы / (все этапы - пропущенные).
export function songProgress(stages: ReadonlyArray<{ status: StageStatus }>): Progress {
  const counted = stages.filter((s) => s.status !== 'skipped');
  const done = counted.filter((s) => s.status === 'done').length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// Этап, на котором песня сейчас: первый не готовый и не пропущенный.
export function currentStage<T extends { status: StageStatus; position: number }>(
  stages: ReadonlyArray<T>,
): T | undefined {
  return [...stages]
    .sort((a, b) => a.position - b.position)
    .find((s) => s.status !== 'done' && s.status !== 'skipped');
}
