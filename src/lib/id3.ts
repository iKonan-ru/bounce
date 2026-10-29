import { BYTES_IN_MEGABYTE } from './format';

// Теги ID3v2 из начала MP3: название, исполнитель, альбом и обложка. Версии 2.2, 2.3 и 2.4;
// ID3v1 из конца файла не читаем - там нет кириллицы и обложек.

/** Теги MP3 */
export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  picture?: Id3Picture;
}

/** Обложка из тегов */
export interface Id3Picture {
  mime: string;
  data: Uint8Array;
}

/** Кодировка текста в кадре ID3 (первый байт кадра) */
enum TextEncoding {
  /** ISO-8859-1; в русских файлах почти всегда на деле cp1251 */
  Latin1 = 0,
  /** UTF-16 с меткой порядка байтов */
  Utf16 = 1,
  /** UTF-16, старший байт первым, без метки */
  Utf16Be = 2,
  /** UTF-8 */
  Utf8 = 3,
}

/** Названия кодировок для TextDecoder по номеру кодировки */
const DECODER_LABELS: readonly string[] = [
  'latin1',
  'utf-16',
  'utf-16be',
  'utf-8',
];

/** Кодировка по умолчанию */
const DEFAULT_DECODER_LABEL = 'latin1';

/** Размер заголовка тега */
const HEADER_SIZE = 10;

/** Начало тега: "ID3" */
const ID3_MAGIC: readonly number[] = [0x49, 0x44, 0x33];

/** Где в заголовке размер тега */
const TAG_SIZE_OFFSET = 6;

/** Где в заголовке версия */
const VERSION_OFFSET = 3;

/** Где в заголовке флаги */
const FLAGS_OFFSET = 5;

/** Поддерживаемые версии ID3v2 */
const MIN_VERSION = 2;
const MAX_VERSION = 4;

/** Флаг тега: рассинхронизация (в 2.4 - у каждого кадра свой) */
const TAG_FLAG_UNSYNC = 0x80;

/** Флаг тега: есть расширенный заголовок */
const TAG_FLAG_EXTENDED = 0x40;

/** Флаг кадра 2.4: рассинхронизация */
const FRAME_FLAG_UNSYNC = 0x02;

/** Флаг кадра 2.4: перед данными их длина */
const FRAME_FLAG_DATA_LENGTH = 0x01;

/** Размер длины данных перед кадром 2.4 */
const DATA_LENGTH_SIZE = 4;

/** Где флаги кадра в заголовке кадра 2.3 и 2.4 */
const FRAME_FLAGS_OFFSET = 9;

/** Размер числа в заголовках: 4 байта */
const INT_SIZE = 4;

/** Значащих битов в байте synchsafe-числа */
const SYNCSAFE_BITS = 7;

/** Маска значащих битов synchsafe-байта */
const SYNCSAFE_MASK = 0x7f;

/** Основание числа из байтов */
const BYTE_BASE = 256;

/** Байт, после которого при рассинхронизации записан лишний ноль */
const UNSYNC_MARKER = 0xff;

/** Первый байт за пределами ASCII */
const NON_ASCII_MIN = 0x80;

/** Метка порядка байтов UTF-16: старший первым */
const BOM_BIG_ENDIAN: readonly number[] = [0xfe, 0xff];

/** Метка порядка байтов UTF-16: младший первым */
const BOM_LITTLE_ENDIAN: readonly number[] = [0xff, 0xfe];

/** Размер метки порядка байтов */
const BOM_SIZE = 2;

/** Метка порядка байтов в начале строки после декодирования */
const BOM_CHAR_RE = /^\uFEFF/;

/** Id кадра: заглавные латинские буквы и цифры; иначе дальше - заполнение нулями */
const FRAME_ID_RE = /^[A-Z0-9]+$/;

/** Тип картинки из тегов: только картинки, он идёт в Blob для экрана блокировки */
const IMAGE_MIME_RE = /^image\/[a-z0-9.+-]+$/;

/** Тип картинки по умолчанию */
const DEFAULT_PICTURE_MIME = 'image/jpeg';

/** Кадры названия, исполнителя, альбома и обложки (2.3/2.4 и 2.2) */
const TITLE_FRAMES: ReadonlySet<string> = new Set(['TIT2', 'TT2']);
const ARTIST_FRAMES: ReadonlySet<string> = new Set(['TPE1', 'TP1']);
const ALBUM_FRAMES: ReadonlySet<string> = new Set(['TALB', 'TAL']);
const PICTURE_FRAMES: ReadonlySet<string> = new Set(['APIC', 'PIC']);

/** Самые большие теги - с обложкой - бывают в несколько мегабайт: больше не читаем */
const MAX_TAG = 4 * BYTES_IN_MEGABYTE;

/** Байты length штук начиная с at; за концом данных - нули */
function readBytes(bytes: Uint8Array, at: number, length: number): number[] {
  return Array.from({ length }, (_value, index) => bytes[at + index] ?? 0);
}

/** Число из 4 байтов по 7 значащих битов */
function readSyncsafe(bytes: Uint8Array, at: number): number {
  return readBytes(bytes, at, INT_SIZE).reduce(
    (value, byte) => (value << SYNCSAFE_BITS) | (byte & SYNCSAFE_MASK),
    0
  );
}

/** Обычное число из length байтов, старший первым */
function readPlain(bytes: Uint8Array, at: number, length: number): number {
  return readBytes(bytes, at, length).reduce(
    (value, byte) => value * BYTE_BASE + byte,
    0
  );
}

/** Байты начинаются с prefix */
function checkStartsWith(
  bytes: Uint8Array,
  prefix: readonly number[]
): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

/** Размер тега целиком (с заголовком) по первым 10 байтам; не ID3 - null */
export function getId3Size(head: Uint8Array): number | null {
  if (head.length < HEADER_SIZE || !checkStartsWith(head, ID3_MAGIC)) {
    return null;
  }

  return HEADER_SIZE + readSyncsafe(head, TAG_SIZE_OFFSET);
}

/** "Рассинхронизация": после каждого 0xFF записан лишний 0x00 */
function removeUnsynchronisation(bytes: Uint8Array): Uint8Array {
  const restored: number[] = [];
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index] ?? 0;
    restored.push(byte);

    if (byte === UNSYNC_MARKER && bytes[index + 1] === 0) {
      index++;
    }
  }

  return Uint8Array.from(restored);
}

/** Строка из байтов в кодировке кадра */
function decodeText(bytes: Uint8Array, encoding: number): string {
  // "latin1" с буквами за пределами ASCII в русских файлах почти всегда на деле cp1251
  const hasNonAscii = bytes.some((byte) => byte >= NON_ASCII_MIN);

  if (encoding === TextEncoding.Latin1 && hasNonAscii) {
    return new TextDecoder('windows-1251').decode(bytes);
  }

  // UTF-16 с меткой порядка байтов: TextDecoder('utf-16') понимает только FF FE (младший
  // первым), а FE FF (старший первым) прочитал бы мусором - порядок берём из метки сами
  if (encoding === TextEncoding.Utf16) {
    const isBigEndian = checkStartsWith(bytes, BOM_BIG_ENDIAN);
    const hasBom = isBigEndian || checkStartsWith(bytes, BOM_LITTLE_ENDIAN);
    const label = isBigEndian ? 'utf-16be' : 'utf-16le';

    if (hasBom) {
      return new TextDecoder(label).decode(bytes.subarray(BOM_SIZE));
    }

    return new TextDecoder(label).decode(bytes);
  }

  const label = DECODER_LABELS[encoding] ?? DEFAULT_DECODER_LABEL;

  return new TextDecoder(label).decode(bytes);
}

/** Кодировка с двухбайтными символами: строка кончается двумя нулями */
function checkIsWideEncoding(encoding: number): boolean {
  return encoding === TextEncoding.Utf16 || encoding === TextEncoding.Utf16Be;
}

/** Конец строки в заданной кодировке: один нулевой байт или два для UTF-16 */
function getTextEnd(bytes: Uint8Array, from: number, encoding: number): number {
  const isWide = checkIsWideEncoding(encoding);
  const step = isWide ? 2 : 1;
  for (let index = from; index < bytes.length; index += step) {
    const isTerminator =
      bytes[index] === 0 && (!isWide || bytes[index + 1] === 0);

    if (isTerminator) {
      return index;
    }
  }

  return bytes.length;
}

/** Текстовый кадр: в 2.4 значений может быть несколько через ноль - берём первое */
function readTextFrame(body: Uint8Array): string {
  const encoding = body[0] ?? TextEncoding.Latin1;
  const rest = body.subarray(1);
  const value = decodeText(
    rest.subarray(0, getTextEnd(rest, 0, encoding)),
    encoding
  );

  return value.replace(BOM_CHAR_RE, '').trim();
}

/** Тип картинки из кадра 2.3/2.4: "image/png", "png" или "jpg" */
function normalizePictureMime(raw: string): string {
  let mime = raw.toLowerCase() || DEFAULT_PICTURE_MIME;

  if (!mime.includes('/')) {
    const subtype = mime === 'jpg' ? 'jpeg' : mime;
    mime = `image/${subtype}`;
  }

  return IMAGE_MIME_RE.test(mime) ? mime : DEFAULT_PICTURE_MIME;
}

/** Тип картинки и где начинается её описание */
interface PictureHead {
  mime: string;
  descriptionStart: number;
}

/** Тип картинки: в 2.2 - три буквы формата, в 2.3/2.4 - строка с нулём в конце */
function readPictureHead(body: Uint8Array, isV22: boolean): PictureHead {
  if (isV22) {
    const format = decodeText(
      body.subarray(1, 4),
      TextEncoding.Latin1
    ).toLowerCase();
    const mime = format === 'png' ? 'image/png' : DEFAULT_PICTURE_MIME;

    // за форматом - байт типа картинки
    return { mime, descriptionStart: 5 };
  }

  const mimeEnd = getTextEnd(body, 1, TextEncoding.Latin1);
  const mime = normalizePictureMime(
    decodeText(body.subarray(1, mimeEnd), TextEncoding.Latin1)
  );

  // за нулём после типа - байт типа картинки
  return { mime, descriptionStart: mimeEnd + 2 };
}

/** Кадр обложки: тип, описание и сами данные */
function readPictureFrame(
  body: Uint8Array,
  isV22: boolean
): Id3Picture | undefined {
  const encoding = body[0] ?? TextEncoding.Latin1;
  const { mime, descriptionStart } = readPictureHead(body, isV22);
  const descriptionEnd = getTextEnd(body, descriptionStart, encoding);
  const terminatorSize = checkIsWideEncoding(encoding) ? 2 : 1;
  const data = body.subarray(descriptionEnd + terminatorSize);

  if (data.length === 0) {
    return undefined;
  }

  return { mime, data };
}

/** Размер кадра: в 2.2 - 3 байта после 3-байтного id, в 2.4 - synchsafe, в 2.3 - обычное число */
function getFrameLength(tag: Uint8Array, at: number, version: number): number {
  if (version === MIN_VERSION) {
    return readPlain(tag, at + 3, 3);
  }

  if (version === MAX_VERSION) {
    return readSyncsafe(tag, at + INT_SIZE);
  }

  return readPlain(tag, at + INT_SIZE, INT_SIZE);
}

/** Размер расширенного заголовка: в 2.4 он входит в своё число, в 2.3 - нет */
function getExtendedHeaderSize(tag: Uint8Array, version: number): number {
  if (version === MAX_VERSION) {
    return readSyncsafe(tag, 0);
  }

  return readPlain(tag, 0, INT_SIZE) + INT_SIZE;
}

/** Данные кадра 2.4 без рассинхронизации и длины перед ними */
function getFrameBody(
  body: Uint8Array,
  version: number,
  frameFlags: number
): Uint8Array {
  if (version !== MAX_VERSION) {
    return body;
  }

  let data = body;

  if (frameFlags & FRAME_FLAG_UNSYNC) {
    data = removeUnsynchronisation(data);
  }

  // в 2.4 перед данными может стоять их длина
  if (frameFlags & FRAME_FLAG_DATA_LENGTH) {
    data = data.subarray(DATA_LENGTH_SIZE);
  }

  return data;
}

/** Записать кадр в теги, если это нужный кадр */
function readFrame(
  tags: Id3Tags,
  id: string,
  body: Uint8Array,
  isV22: boolean
): void {
  if (TITLE_FRAMES.has(id)) {
    tags.title = readTextFrame(body);

    return;
  }

  if (ARTIST_FRAMES.has(id)) {
    tags.artist = readTextFrame(body);

    return;
  }

  if (ALBUM_FRAMES.has(id)) {
    tags.album = readTextFrame(body);

    return;
  }

  if (!PICTURE_FRAMES.has(id) || tags.picture) {
    return;
  }

  const picture = readPictureFrame(body, isV22);

  if (picture) {
    tags.picture = picture;
  }
}

/** Разбирает тег из начала файла (нужны первые id3Size байт) */
export function parseId3(bytes: Uint8Array): Id3Tags | null {
  const size = getId3Size(bytes);

  if (size === null) {
    return null;
  }

  const version = bytes[VERSION_OFFSET] ?? 0;
  const flags = bytes[FLAGS_OFFSET] ?? 0;

  if (version < MIN_VERSION || version > MAX_VERSION) {
    return null;
  }

  let tag = bytes.subarray(HEADER_SIZE, Math.min(size, bytes.length));
  const isTagUnsynced =
    Boolean(flags & TAG_FLAG_UNSYNC) && version < MAX_VERSION;

  if (isTagUnsynced) {
    tag = removeUnsynchronisation(tag);
  }

  let at = 0;
  // расширенный заголовок пропускаем
  const hasExtendedHeader =
    Boolean(flags & TAG_FLAG_EXTENDED) && version > MIN_VERSION;

  if (hasExtendedHeader) {
    at = getExtendedHeaderSize(tag, version);
  }

  const isV22 = version === MIN_VERSION;
  const idLength = isV22 ? 3 : 4;
  const frameHeaderSize = isV22 ? 6 : 10;
  const tags: Id3Tags = {};
  while (at + frameHeaderSize <= tag.length) {
    const id = decodeText(tag.subarray(at, at + idLength), TextEncoding.Latin1);

    if (!FRAME_ID_RE.test(id)) {
      break;
    }

    const length = getFrameLength(tag, at, version);
    const frameFlags = isV22 ? 0 : (tag[at + FRAME_FLAGS_OFFSET] ?? 0);
    const bodyStart = at + frameHeaderSize;
    const body = getFrameBody(
      tag.subarray(bodyStart, bodyStart + length),
      version,
      frameFlags
    );
    at = bodyStart + length;

    if (length > 0) {
      readFrame(tags, id, body, isV22);
    }
  }

  return tags;
}

/** Кусок файла по ссылке запросом с Range */
async function fetchRange(
  url: string,
  from: number,
  to: number,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const init: RequestInit = { headers: { Range: `bytes=${from}-${to}` } };

  if (signal) {
    init.signal = signal;
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  // сервер без Range отдаёт файл целиком - берём нужный кусок
  return bytes.subarray(0, to - from + 1);
}

/**
 * Теги MP3 по ссылке: сначала заголовок, потом сам тег (запросами с Range, файл целиком не качается)
 *
 * Нет тега или ошибка - null
 */
export async function fetchId3(
  url: string,
  signal?: AbortSignal
): Promise<Id3Tags | null> {
  try {
    const head = await fetchRange(url, 0, HEADER_SIZE - 1, signal);
    const size = getId3Size(head);

    if (size === null || size > MAX_TAG) {
      return null;
    }

    return parseId3(await fetchRange(url, 0, size - 1, signal));
  } catch {
    return null;
  }
}
