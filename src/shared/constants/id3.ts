import { BYTES_IN_MEGABYTE } from './format';

/** Названия кодировок для TextDecoder по номеру кодировки */
export const DECODER_LABELS: readonly string[] = [
  'latin1',
  'utf-16',
  'utf-16be',
  'utf-8',
];

/** Кодировка по умолчанию */
export const DEFAULT_DECODER_LABEL = 'latin1';

/** Размер заголовка тега */
export const HEADER_SIZE = 10;

/** Начало тега: "ID3" */
export const ID3_MAGIC: readonly number[] = [0x49, 0x44, 0x33];

/** Где в заголовке размер тега */
export const TAG_SIZE_OFFSET = 6;

/** Где в заголовке версия */
export const VERSION_OFFSET = 3;

/** Где в заголовке флаги */
export const FLAGS_OFFSET = 5;

/** Поддерживаемые версии ID3v2 */
export const MIN_VERSION = 2;

export const MAX_VERSION = 4;

/** Флаг тега: рассинхронизация (в 2.4 - у каждого кадра свой) */
export const TAG_FLAG_UNSYNC = 0x80;

/** Флаг тега: есть расширенный заголовок */
export const TAG_FLAG_EXTENDED = 0x40;

/** Флаг кадра 2.4: рассинхронизация */
export const FRAME_FLAG_UNSYNC = 0x02;

/** Флаг кадра 2.4: перед данными их длина */
export const FRAME_FLAG_DATA_LENGTH = 0x01;

/** Размер длины данных перед кадром 2.4 */
export const DATA_LENGTH_SIZE = 4;

/** Где флаги кадра в заголовке кадра 2.3 и 2.4 */
export const FRAME_FLAGS_OFFSET = 9;

/** Размер числа в заголовках: 4 байта */
export const INT_SIZE = 4;

/** Значащих битов в байте synchsafe-числа */
export const SYNCSAFE_BITS = 7;

/** Маска значащих битов synchsafe-байта */
export const SYNCSAFE_MASK = 0x7f;

/** Основание числа из байтов */
export const BYTE_BASE = 256;

/** Байт, после которого при рассинхронизации записан лишний ноль */
export const UNSYNC_MARKER = 0xff;

/** Первый байт за пределами ASCII */
export const NON_ASCII_MIN = 0x80;

/** Метка порядка байтов UTF-16: старший первым */
export const BOM_BIG_ENDIAN: readonly number[] = [0xfe, 0xff];

/** Метка порядка байтов UTF-16: младший первым */
export const BOM_LITTLE_ENDIAN: readonly number[] = [0xff, 0xfe];

/** Размер метки порядка байтов */
export const BOM_SIZE = 2;

/** Метка порядка байтов в начале строки после декодирования */
export const BOM_CHAR_RE = /^\uFEFF/;

/** Id кадра: заглавные латинские буквы и цифры; иначе дальше - заполнение нулями */
export const FRAME_ID_RE = /^[A-Z0-9]+$/;

/** Тип картинки из тегов: только картинки, он идёт в Blob для экрана блокировки */
export const IMAGE_MIME_RE = /^image\/[a-z0-9.+-]+$/;

/** Тип картинки по умолчанию */
export const DEFAULT_PICTURE_MIME = 'image/jpeg';

/** Кадры названия, исполнителя, альбома и обложки (2.3/2.4 и 2.2) */
export const TITLE_FRAMES: ReadonlySet<string> = new Set(['TIT2', 'TT2']);

export const ARTIST_FRAMES: ReadonlySet<string> = new Set(['TPE1', 'TP1']);

export const ALBUM_FRAMES: ReadonlySet<string> = new Set(['TALB', 'TAL']);

export const PICTURE_FRAMES: ReadonlySet<string> = new Set(['APIC', 'PIC']);

/** Самые большие теги - с обложкой - бывают в несколько мегабайт: больше не читаем */
export const MAX_TAG = 4 * BYTES_IN_MEGABYTE;
