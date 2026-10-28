import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { fromDay, toDay } from '@/lib/format';
import { insertTag, lyricsParts, numberVerses, plainLyrics } from '@/lib/lyrics';
import { mainCover, releaseDue, releaseMissing, songStatus } from '@/lib/model';
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

describe('релиз', () => {
  const now = new Date(2026, 9, 28, 15);
  it('день релиза наступил - в сам день и после', () => {
    expect(releaseDue('2026-10-28 12:00:00.000Z', now)).toBe(true);
    expect(releaseDue('2026-10-29 12:00:00.000Z', now)).toBe(false);
    expect(releaseDue('', now)).toBe(false);
  });
  it('отправленная песня после даты показывается выпущенной', () => {
    expect(songStatus({ status: 'sent', target_release: '2020-01-01 12:00:00.000Z' })).toBe(
      'released',
    );
    expect(songStatus({ status: 'done', target_release: '2020-01-01 12:00:00.000Z' })).toBe('done');
  });
  it('для отправки нужны текст и обложка для релиза', () => {
    expect(releaseMissing({ lyrics: ' ', release_cover: '' })).toEqual([
      'текст песни',
      'обложка для релиза',
    ]);
  });
});

describe('метки текста песни', () => {
  it('куплеты без номера нумеруются, если их больше одного', () => {
    const parts = lyricsParts('[Куплет]\nа\n[Припев]\nб\n[Куплет]\nв\n[Куплет 7]\nг');
    expect(numberVerses(parts).map((p) => p.title)).toEqual([
      'Куплет 1',
      'Припев',
      'Куплет 2',
      'Куплет 7',
    ]);
    expect(numberVerses(lyricsParts('[Куплет]\nа')).map((p) => p.title)).toEqual(['Куплет']);
  });

  it('копия текста - без меток, части через пустую строку', () => {
    expect(plainLyrics('[Куплет]\nраз\nдва\n\n\n[Припев]\n\nтри\n[Соло]\n')).toBe(
      'раз\nдва\n\nтри',
    );
  });

  it('метка встаёт отдельной строкой после пустой строки', () => {
    expect(insertTag({ value: '', start: 0, end: 0 }, 'Куплет')).toEqual({
      value: '[Куплет]\n',
      start: 9,
      end: 9,
    });
    const text = 'раз\nдва';
    const r = insertTag({ value: text, start: text.length, end: text.length }, 'Припев');
    expect(r.value).toBe('раз\nдва\n\n[Припев]\n');
    expect(r.start).toBe(r.value.length);
    expect(insertTag({ value: 'раз\n', start: 4, end: 4 }, 'Бридж').value).toBe('раз\n\n[Бридж]\n');
  });
});
