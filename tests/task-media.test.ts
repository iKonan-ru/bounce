import { describe, expect, it } from 'vitest';
import { getPlanDirectionOptions } from '@/pages/my-plan';
import {
  getTaskMediaOptions,
  getTaskMediaPatch,
  getTaskMediaTitle,
  getTaskMediaValue,
} from '@/widgets/plan';

describe('контекст задачи', () => {
  it('различает одинаковые id и названия песни и видео', () => {
    const options = getTaskMediaOptions(
      [{ id: 'same', title: 'Премьера' }],
      [{ id: 'same', title: 'Премьера' }]
    );
    expect(options.map((option) => option.value)).toEqual([
      'project',
      'song:same',
      'video:same',
    ]);
    expect(options.map((option) => option.hint)).toEqual([
      undefined,
      'Песня',
      'Видео',
    ]);
  });

  it('смена контекста всегда очищает предыдущую связь', () => {
    expect(getTaskMediaPatch('song:s')).toEqual({ song: 's', video: '' });
    expect(getTaskMediaPatch('video:v')).toEqual({ song: '', video: 'v' });
    expect(getTaskMediaPatch('project')).toEqual({ song: '', video: '' });
    for (const value of ['song:s', 'video:v', 'project']) {
      expect(getTaskMediaValue(getTaskMediaPatch(value))).toBe(value);
    }
  });

  it('без медиа остается только проект', () => {
    expect(getTaskMediaOptions([], [])).toEqual([
      { value: 'project', label: 'Проекту целиком' },
    ]);
  });

  it('загружает название непосредственного медиа и сохраняет контекст при неполном кэше', () => {
    expect(
      getTaskMediaTitle(
        { song: '', video: 'v' },
        [],
        [{ id: 'v', title: 'Клип' }]
      )
    ).toBe('Клип');
    expect(getTaskMediaTitle({ song: 's', video: '' }, [], [])).toBe('Песня');
    expect(getTaskMediaTitle({ song: '', video: 'v' }, [], [])).toBe('Видео');
    expect(getTaskMediaTitle({ song: '', video: '' }, [], [])).toBe('');
  });
});

describe('направления фильтра плана', () => {
  it('без музыки не предлагает музыкальный фильтр', () => {
    expect(
      getPlanDirectionOptions(['video']).map((option) => option.value)
    ).toEqual(['all', 'general', 'video']);
  });

  it('отделяет общие задачи от этапов задач', () => {
    expect(
      getPlanDirectionOptions(['other']).map((option) => option.value)
    ).toEqual(['all', 'general', 'other']);
    expect(
      getPlanDirectionOptions(['music', 'video']).map((option) => option.value)
    ).toEqual(['all', 'general', 'music', 'video']);
  });
});
