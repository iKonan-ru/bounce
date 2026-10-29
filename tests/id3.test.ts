import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { id3Size, parseId3 } from '@/lib/id3';

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)));

// тег ID3v2.3 из одного текстового кадра (без рассинхронизации)
function tag23(id: string, encoding: number, text: Uint8Array): Uint8Array {
  const body = Uint8Array.from([encoding, ...text]);
  const frame = Uint8Array.from([
    ...new TextEncoder().encode(id),
    0,
    0,
    (body.length >> 8) & 0xff,
    body.length & 0xff,
    0,
    0,
    ...body,
  ]);
  const n = frame.length;
  return Uint8Array.from([
    0x49,
    0x44,
    0x33,
    3,
    0,
    0,
    (n >> 21) & 0x7f,
    (n >> 14) & 0x7f,
    (n >> 7) & 0x7f,
    n & 0x7f,
    ...frame,
  ]);
}

describe('теги MP3', () => {
  for (const v of ['v23', 'v24']) {
    it(`ID3${v}: название, исполнитель, альбом и обложка`, () => {
      const bytes = fixture(`tagged-${v}.mp3`);
      expect(id3Size(bytes)).toBeGreaterThan(10);
      const tags = parseId3(bytes);
      expect(tags?.title).toBe('Линии страсти (демо)');
      expect(tags?.artist).toBe('Милиганы');
      expect(tags?.album).toBe('Сырые записи');
      expect(tags?.picture?.mime).toBe('image/png');
      // PNG начинается с 0x89 'P' 'N' 'G'
      expect(Array.from(tags?.picture?.data.subarray(0, 4) ?? [])).toEqual([
        0x89, 0x50, 0x4e, 0x47,
      ]);
    });
  }

  it('без тега - null', () => {
    expect(id3Size(fixture('untagged.mp3'))).toBeNull();
    expect(parseId3(fixture('untagged.mp3'))).toBeNull();
  });

  it('"latin1" с русскими буквами читается как cp1251', () => {
    // "Песня" в cp1251
    const tags = parseId3(tag23('TIT2', 0, Uint8Array.from([0xcf, 0xe5, 0xf1, 0xed, 0xff])));
    expect(tags?.title).toBe('Песня');
  });

  it('UTF-16 с меткой порядка байтов', () => {
    const text = Uint8Array.from([0xff, 0xfe, 0x1f, 0x04, 0x35, 0x04]); // "Пе"
    expect(parseId3(tag23('TPE1', 1, text))?.artist).toBe('Пе');
  });

  it('UTF-16 со старшим байтом первым (метка FE FF)', () => {
    const text = Uint8Array.from([0xfe, 0xff, 0x04, 0x1f, 0x04, 0x35]); // "Пе"
    expect(parseId3(tag23('TPE1', 1, text))?.artist).toBe('Пе');
  });
});
