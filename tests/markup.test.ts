import { describe, expect, it } from 'vitest';
import { linkLabel, parseInline, parseMarkup, safeUrl } from '@/lib/markup';

describe('parseInline', () => {
  it('жирный, курсив, подчёркнутый, зачёркнутый, код', () => {
    expect(parseInline('**Gain 3** и *тёплый*, __важно__, ~~старое~~, `-6 dB`')).toEqual([
      { t: 'bold', children: [{ t: 'text', text: 'Gain 3' }] },
      { t: 'text', text: ' и ' },
      { t: 'italic', children: [{ t: 'text', text: 'тёплый' }] },
      { t: 'text', text: ', ' },
      { t: 'underline', children: [{ t: 'text', text: 'важно' }] },
      { t: 'text', text: ', ' },
      { t: 'strike', children: [{ t: 'text', text: 'старое' }] },
      { t: 'text', text: ', ' },
      { t: 'code', text: '-6 dB' },
    ]);
  });

  it('вложенность: курсив внутри жирного', () => {
    expect(parseInline('**бас _тише_**')).toEqual([
      {
        t: 'bold',
        children: [
          { t: 'text', text: 'бас ' },
          { t: 'italic', children: [{ t: 'text', text: 'тише' }] },
        ],
      },
    ]);
  });

  it('звёздочки и подчёркивания внутри слов и чисел - просто текст', () => {
    expect(parseInline('2*3*4 и snake_case_name')).toEqual([
      { t: 'text', text: '2*3*4 и snake_case_name' },
    ]);
    expect(parseInline('* не курсив *')).toEqual([{ t: 'text', text: '* не курсив *' }]);
  });

  it('ссылки: голые, с подписью, без хвостовой пунктуации; разметка внутри адреса не разбирается', () => {
    expect(parseInline('смотри https://youtu.be/a_b_c.')).toEqual([
      { t: 'text', text: 'смотри ' },
      { t: 'link', url: 'https://youtu.be/a_b_c', children: null },
      { t: 'text', text: '.' },
    ]);
    expect(parseInline('[демо](https://disk.yandex.ru/d/x)')).toEqual([
      { t: 'link', url: 'https://disk.yandex.ru/d/x', children: [{ t: 'text', text: 'демо' }] },
    ]);
    expect(parseInline('www.example.com')).toEqual([
      { t: 'link', url: 'https://www.example.com/', children: null },
    ]);
  });

  it('опасные адреса не становятся ссылками', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(parseInline('[x](javascript:alert(1))')[0]?.t).toBe('text');
  });
});

describe('parseMarkup', () => {
  it('абзацы, списки, нумерация, цитата', () => {
    const blocks = parseMarkup('Сделать:\n- бас\n- вокал\n\n1. мастер\n2. релиз\n> цитата');
    expect(blocks.map((b) => b.t)).toEqual(['p', 'ul', 'ol', 'quote']);
    expect(blocks[1]).toMatchObject({ t: 'ul', items: [[{ text: 'бас' }], [{ text: 'вокал' }]] });
    expect(blocks[2]).toMatchObject({ t: 'ol', start: 1 });
  });

  it('строки абзаца сохраняются', () => {
    expect(parseMarkup('раз\nдва')).toEqual([
      { t: 'p', lines: [[{ t: 'text', text: 'раз' }], [{ t: 'text', text: 'два' }]] },
    ]);
  });
});

describe('linkLabel', () => {
  it('известные сервисы', () => {
    expect(linkLabel('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('YouTube · видео');
    expect(linkLabel('https://youtube.com/shorts/abc')).toBe('YouTube · Shorts');
    expect(linkLabel('https://open.spotify.com/track/123')).toBe('Spotify · трек');
    expect(linkLabel('https://music.yandex.ru/album/1/track/2')).toBe('Яндекс Музыка · трек');
    expect(linkLabel('https://disk.yandex.ru/d/abc')).toBe('Яндекс Диск');
    expect(linkLabel('https://band.link/withme')).toBe('Bandlink');
    expect(linkLabel('https://www.instagram.com/reel/xyz/')).toBe('Instagram · Reels');
  });

  it('остальное - домен и начало пути', () => {
    expect(linkLabel('https://www.example.com/')).toBe('example.com');
    expect(linkLabel('https://example.com/blog')).toBe('example.com/blog');
    expect(linkLabel('https://example.com/blog/2026/10/post')).toBe('example.com/blog/...');
    expect(linkLabel('https://example.com/a-very-long-first-segment-here')).toBe(
      'example.com/a-very-long-first...',
    );
  });
});
