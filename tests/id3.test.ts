import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getId3Size, parseId3 } from '@/lib/id3';

/** Кодировка текста в кадре ID3 (первый байт кадра) */
enum TextEncoding {
  /** По стандарту ISO-8859-1, на деле часто cp1251 */
  Latin1 = 0,
  /** UTF-16 с меткой порядка байтов */
  Utf16 = 1,
}

/** Начало заголовка тега: "ID3", версия 2.3.0, без флагов */
const ID3V23_HEADER_START = [0x49, 0x44, 0x33, 3, 0, 0];

/** Пустые флаги кадра (два байта) */
const NO_FRAME_FLAGS = [0, 0];

/** Старшие байты размера кадра: кадры в тестах короче 64 КБ */
const FRAME_SIZE_HIGH_BYTES = [0, 0];

/** Маска одного байта */
const BYTE_MASK = 0xff;

/** Маска 7 бит: размер тега записан syncsafe-числом, по 7 бит в байте */
const SYNCSAFE_MASK = 0x7f;

/** Сдвиги байтов syncsafe-числа, от старшего к младшему */
const SYNCSAFE_SHIFTS = [21, 14, 7, 0];

/** Сколько байтов сигнатуры PNG проверяется */
const PNG_SIGNATURE_LENGTH = 4;

/** Файл из tests/fixtures */
function readFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)));
}

/** Размер тега в виде syncsafe-байтов */
function getSyncsafeBytes(size: number): number[] {
  return SYNCSAFE_SHIFTS.map((shift) => (size >> shift) & SYNCSAFE_MASK);
}

/** Тег ID3v2.3 из одного текстового кадра (без рассинхронизации) */
function createId3v23Tag(frameId: string, encoding: TextEncoding, text: Uint8Array): Uint8Array {
  const body = Uint8Array.from([encoding, ...text]);
  const frame = Uint8Array.from([
    ...new TextEncoder().encode(frameId),
    ...FRAME_SIZE_HIGH_BYTES,
    (body.length >> 8) & BYTE_MASK,
    body.length & BYTE_MASK,
    ...NO_FRAME_FLAGS,
    ...body,
  ]);
  return Uint8Array.from([...ID3V23_HEADER_START, ...getSyncsafeBytes(frame.length), ...frame]);
}

describe('теги MP3', () => {
  for (const version of ['v23', 'v24']) {
    it(`ID3${version}: название, исполнитель, альбом и обложка`, () => {
      const bytes = readFixture(`tagged-${version}.mp3`);
      expect(getId3Size(bytes)).toBeGreaterThan(10);
      const tags = parseId3(bytes);
      expect(tags?.title).toBe('Линии страсти (демо)');
      expect(tags?.artist).toBe('Милиганы');
      expect(tags?.album).toBe('Сырые записи');
      expect(tags?.picture?.mime).toBe('image/png');
      // PNG начинается с 0x89 'P' 'N' 'G'
      const pictureStart = tags?.picture?.data.subarray(0, PNG_SIGNATURE_LENGTH) ?? [];
      expect(Array.from(pictureStart)).toEqual([0x89, 0x50, 0x4e, 0x47]);
    });
  }

  it('без тега - null', () => {
    expect(getId3Size(readFixture('untagged.mp3'))).toBeNull();
    expect(parseId3(readFixture('untagged.mp3'))).toBeNull();
  });

  it('"latin1" с русскими буквами читается как cp1251', () => {
    // "Песня" в cp1251
    const text = Uint8Array.from([0xcf, 0xe5, 0xf1, 0xed, 0xff]);
    const tags = parseId3(createId3v23Tag('TIT2', TextEncoding.Latin1, text));
    expect(tags?.title).toBe('Песня');
  });

  it('UTF-16 с меткой порядка байтов', () => {
    const text = Uint8Array.from([0xff, 0xfe, 0x1f, 0x04, 0x35, 0x04]); // "Пе"
    expect(parseId3(createId3v23Tag('TPE1', TextEncoding.Utf16, text))?.artist).toBe('Пе');
  });

  it('UTF-16 со старшим байтом первым (метка FE FF)', () => {
    const text = Uint8Array.from([0xfe, 0xff, 0x04, 0x1f, 0x04, 0x35]); // "Пе"
    expect(parseId3(createId3v23Tag('TPE1', TextEncoding.Utf16, text))?.artist).toBe('Пе');
  });
});
