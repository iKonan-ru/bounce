import { describe, expect, it } from 'vitest';
import { StageStatus, getCurrentStage, getSongProgress } from '@/entities/song';

describe('songProgress', () => {
  it('не считает пропущенные этапы', () => {
    const progress = getSongProgress([
      { status: StageStatus.done },
      { status: StageStatus.done },
      { status: StageStatus.in_progress },
      { status: StageStatus.skipped },
    ]);
    expect(progress).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it('без этапов - ноль, а не NaN', () => {
    expect(getSongProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('currentStage', () => {
  it('первый незавершённый по порядку', () => {
    const stage = getCurrentStage([
      { position: 2, status: StageStatus.not_started },
      { position: 0, status: StageStatus.done },
      { position: 1, status: StageStatus.skipped },
    ]);
    expect(stage?.position).toBe(2);
  });
});
