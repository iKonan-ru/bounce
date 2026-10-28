import { describe, expect, it } from 'vitest';
import { currentStage, songProgress } from '@/lib/progress';

describe('songProgress', () => {
  it('не считает пропущенные этапы', () => {
    const p = songProgress([
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' },
      { status: 'skipped' },
    ]);
    expect(p).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it('без этапов - ноль, а не NaN', () => {
    expect(songProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('currentStage', () => {
  it('первый незавершённый по порядку', () => {
    const s = currentStage([
      { position: 2, status: 'not_started' },
      { position: 0, status: 'done' },
      { position: 1, status: 'skipped' },
    ]);
    expect(s?.position).toBe(2);
  });
});
