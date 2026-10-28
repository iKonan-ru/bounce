import { describe, expect, it } from 'vitest';
import { parseTags } from '@/lib/findings';
import { lyricsParts } from '@/lib/lyrics';
import { moved, nextPosition } from '@/lib/order';
import { titleFromIdea } from '@/lib/songs';

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

describe('parseTags', () => {
  it('без решёток, повторов и пустых', () => {
    expect(parseTags('#Тёплый, ламповый,, тёплый\nдабл')).toEqual(['тёплый', 'ламповый', 'дабл']);
  });
});

describe('moved', () => {
  const items = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 2 },
  ];
  it('сдвигает на шаг', () => {
    expect(moved(items, 'c', -1).map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(moved(items, 'a', 1).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('за край не уходит', () => {
    expect(moved(items, 'a', -1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('новая позиция - в конце', () => {
    expect(nextPosition(items)).toBe(3);
    expect(nextPosition([])).toBe(0);
  });
});

describe('titleFromIdea', () => {
  it('первая строка идеи', () => {
    expect(titleFromIdea('  Баллада про поезд\nв 6/8  ')).toBe('Баллада про поезд');
    expect(titleFromIdea('')).toBe('Новая песня');
    expect(titleFromIdea('x'.repeat(100))).toHaveLength(82);
  });
});
