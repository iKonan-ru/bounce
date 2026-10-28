import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { fromDay, toDay } from '@/lib/format';
import { lyricsParts } from '@/lib/lyrics';
import { mainCover } from '@/lib/model';
import { isNetworkError } from '@/lib/outbox';
import { titleFromNote } from '@/lib/songs';
import { arrayMoveById, nextPosition } from '@/lib/stages';

describe('lyricsParts', () => {
  it('делит текст на части по [Заголовкам]', () => {
    expect(lyricsParts('[Куплет 1]\nраз\nдва\n\n[Припев]\nтри\n')).toEqual([
      { title: 'Куплет 1', lines: ['раз', 'два'] },
      { title: 'Припев', lines: ['три'] },
    ]);
  });

  it('текст без разметки - одна часть без заголовка', () => {
    expect(lyricsParts('\nстрока\n\n')).toEqual([{ title: '', lines: ['строка'] }]);
  });
});

describe('arrayMoveById', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('элемент встаёт на место другого', () => {
    expect(arrayMoveById(items, 'c', 'a').map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(arrayMoveById(items, 'a', 'c').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('неизвестный id ничего не меняет', () => {
    expect(arrayMoveById(items, 'x', 'a').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('новая позиция - в конце', () => {
    expect(
      nextPosition([
        { id: 'a', position: 0 },
        { id: 'b', position: 4 },
      ]),
    ).toBe(5);
    expect(nextPosition([])).toBe(0);
  });
});

describe('titleFromNote', () => {
  it('первая строка заметки', () => {
    expect(titleFromNote('  Баллада про поезд\nв 6/8  ')).toBe('Баллада про поезд');
    expect(titleFromNote('')).toBe('');
    expect(titleFromNote('x'.repeat(100))).toHaveLength(82);
  });
});

describe('mainCover', () => {
  it('выбранная обложка, иначе первая', () => {
    expect(mainCover({ covers: ['a.png', 'b.png'], main_cover: 'b.png' })).toBe('b.png');
    expect(mainCover({ covers: ['a.png', 'b.png'], main_cover: 'gone.png' })).toBe('a.png');
    expect(mainCover({ covers: [], main_cover: '' })).toBeUndefined();
  });
});

describe('даты календаря', () => {
  it('день из календаря хранится полднем UTC и читается тем же днём', () => {
    const stored = fromDay(new Date(2026, 11, 12));
    expect(stored).toBe('2026-12-12 12:00:00.000Z');
    expect(toDay(stored)?.getDate()).toBe(12);
    expect(toDay('')).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('обрыв сети - да, ответ сервера - нет', () => {
    expect(isNetworkError(new ClientResponseError({ status: 0 }))).toBe(true);
    expect(isNetworkError(new Error('сеть недоступна'))).toBe(true);
    expect(isNetworkError(new ClientResponseError({ status: 400 }))).toBe(false);
  });
});
