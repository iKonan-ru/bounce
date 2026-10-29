import { describe, expect, it } from 'vitest';
import {
  BlockKind,
  getLinkLabel,
  getSafeUrl,
  InlineKind,
  parseInline,
  parseMarkup,
} from '@/lib/markup';

describe('parseInline', () => {
  it('упоминания: @логин, но не почта', () => {
    expect(parseInline('@pasha, глянь; a@b.ru')).toEqual([
      { kind: InlineKind.Mention, username: 'pasha' },
      { kind: InlineKind.Text, text: ', глянь; a@b.ru' },
    ]);
    expect(parseInline('бас @k_lena_')).toEqual([
      { kind: InlineKind.Text, text: 'бас ' },
      { kind: InlineKind.Mention, username: 'k_lena' },
      { kind: InlineKind.Text, text: '_' },
    ]);
  });

  it('жирный, курсив, подчёркнутый, зачёркнутый, код', () => {
    expect(
      parseInline('**Gain 3** и *тёплый*, __важно__, ~~старое~~, `-6 dB`')
    ).toEqual([
      {
        kind: InlineKind.Bold,
        children: [{ kind: InlineKind.Text, text: 'Gain 3' }],
      },
      { kind: InlineKind.Text, text: ' и ' },
      {
        kind: InlineKind.Italic,
        children: [{ kind: InlineKind.Text, text: 'тёплый' }],
      },
      { kind: InlineKind.Text, text: ', ' },
      {
        kind: InlineKind.Underline,
        children: [{ kind: InlineKind.Text, text: 'важно' }],
      },
      { kind: InlineKind.Text, text: ', ' },
      {
        kind: InlineKind.Strike,
        children: [{ kind: InlineKind.Text, text: 'старое' }],
      },
      { kind: InlineKind.Text, text: ', ' },
      { kind: InlineKind.Code, text: '-6 dB' },
    ]);
  });

  it('вложенность: курсив внутри жирного', () => {
    expect(parseInline('**бас _тише_**')).toEqual([
      {
        kind: InlineKind.Bold,
        children: [
          { kind: InlineKind.Text, text: 'бас ' },
          {
            kind: InlineKind.Italic,
            children: [{ kind: InlineKind.Text, text: 'тише' }],
          },
        ],
      },
    ]);
  });

  it('звёздочки и подчёркивания внутри слов и чисел - просто текст', () => {
    expect(parseInline('2*3*4 и snake_case_name')).toEqual([
      { kind: InlineKind.Text, text: '2*3*4 и snake_case_name' },
    ]);
    expect(parseInline('* не курсив *')).toEqual([
      { kind: InlineKind.Text, text: '* не курсив *' },
    ]);
  });

  it('ссылки: голые, с подписью, без хвостовой пунктуации; разметка внутри адреса не разбирается', () => {
    expect(parseInline('смотри https://youtu.be/a_b_c.')).toEqual([
      { kind: InlineKind.Text, text: 'смотри ' },
      { kind: InlineKind.Link, url: 'https://youtu.be/a_b_c', children: null },
      { kind: InlineKind.Text, text: '.' },
    ]);
    expect(parseInline('[демо](https://disk.yandex.ru/d/x)')).toEqual([
      {
        kind: InlineKind.Link,
        url: 'https://disk.yandex.ru/d/x',
        children: [{ kind: InlineKind.Text, text: 'демо' }],
      },
    ]);
    expect(parseInline('www.example.com')).toEqual([
      {
        kind: InlineKind.Link,
        url: 'https://www.example.com/',
        children: null,
      },
    ]);
  });

  it('опасные адреса не становятся ссылками', () => {
    expect(getSafeUrl('javascript:alert(1)')).toBeNull();
    expect(parseInline('[x](javascript:alert(1))')[0]?.kind).toBe(
      InlineKind.Text
    );
  });
});

describe('parseMarkup', () => {
  it('абзацы, списки, нумерация, цитата', () => {
    const blocks = parseMarkup(
      'Сделать:\n- бас\n- вокал\n\n1. мастер\n2. релиз\n> цитата'
    );
    expect(blocks.map((block) => block.kind)).toEqual([
      BlockKind.Paragraph,
      BlockKind.List,
      BlockKind.OrderedList,
      BlockKind.Quote,
    ]);
    expect(blocks[1]).toMatchObject({
      kind: BlockKind.List,
      items: [[{ text: 'бас' }], [{ text: 'вокал' }]],
    });
    expect(blocks[2]).toMatchObject({ kind: BlockKind.OrderedList, start: 1 });
  });

  it('строки абзаца сохраняются', () => {
    expect(parseMarkup('раз\nдва')).toEqual([
      {
        kind: BlockKind.Paragraph,
        lines: [
          [{ kind: InlineKind.Text, text: 'раз' }],
          [{ kind: InlineKind.Text, text: 'два' }],
        ],
      },
    ]);
  });
});

describe('linkLabel', () => {
  it('известные сервисы', () => {
    expect(getLinkLabel('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'YouTube · видео'
    );
    expect(getLinkLabel('https://youtube.com/shorts/abc')).toBe(
      'YouTube · Shorts'
    );
    expect(getLinkLabel('https://open.spotify.com/track/123')).toBe(
      'Spotify · трек'
    );
    expect(getLinkLabel('https://music.yandex.ru/album/1/track/2')).toBe(
      'Яндекс Музыка · трек'
    );
    expect(getLinkLabel('https://disk.yandex.ru/d/abc')).toBe('Яндекс Диск');
    expect(getLinkLabel('https://band.link/withme')).toBe('Bandlink');
    expect(getLinkLabel('https://www.instagram.com/reel/xyz/')).toBe(
      'Instagram · Reels'
    );
  });

  it('остальное - домен и начало пути', () => {
    expect(getLinkLabel('https://www.example.com/')).toBe('example.com');
    expect(getLinkLabel('https://example.com/blog')).toBe('example.com/blog');
    expect(getLinkLabel('https://example.com/blog/2026/10/post')).toBe(
      'example.com/blog/...'
    );
    expect(
      getLinkLabel('https://example.com/a-very-long-first-segment-here')
    ).toBe('example.com/a-very-long-first...');
  });
});
