import { describe, expect, it, vi } from 'vitest';
import {
  getMaterialDirection,
  getRememberedDirection,
  rememberDirection,
} from '@/entities/project';

/** Выбор не должен заводить в отключенное направление */
describe('вход в материалы проекта', () => {
  it('выбирает сохраненное направление или доступную замену', () => {
    expect(
      getMaterialDirection({ directions: ['music', 'video'] }, 'video')
    ).toBe('video');
    expect(
      getMaterialDirection({ directions: ['music', 'video'] }, 'music')
    ).toBe('music');
    expect(getMaterialDirection({ directions: ['music'] }, 'video')).toBe(
      'music'
    );
    expect(getMaterialDirection({ directions: ['video'] }, 'music')).toBe(
      'video'
    );
    expect(getMaterialDirection({ directions: ['music', 'video'] }, null)).toBe(
      'music'
    );
    expect(
      getMaterialDirection({ directions: ['music', 'video'] }, 'obsolete')
    ).toBe('music');
  });
  it('открывает Задачи отдельно и возвращается в доступный раздел', () => {
    expect(getMaterialDirection({ directions: ['other'] }, 'music')).toBe(
      'other'
    );
    expect(
      getMaterialDirection({ directions: ['music', 'other'] }, 'other')
    ).toBe('other');
    expect(getMaterialDirection({ directions: ['video'] }, 'other')).toBe(
      'video'
    );
  });
  it('разделяет пользователей и проекты', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    try {
      rememberDirection('first', 'project', 'video');
      rememberDirection('second', 'project', 'music');
      expect(getRememberedDirection('first', 'project')).toBe('video');
      expect(getRememberedDirection('second', 'project')).toBe('music');
      expect(getRememberedDirection('first', 'another')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
