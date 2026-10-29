// Теги ID3v2 из начала MP3: название, исполнитель, альбом и обложка. Версии 2.2, 2.3 и 2.4;
// ID3v1 из конца файла не читаем - там нет кириллицы и обложек.

export type Id3Tags = {
  title?: string;
  artist?: string;
  album?: string;
  picture?: { mime: string; data: Uint8Array };
};

const HEADER = 10;

// размер тега целиком (с заголовком) по первым 10 байтам; не ID3 - null
export function id3Size(head: Uint8Array): number | null {
  if (head.length < HEADER || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return null;
  return HEADER + syncsafe(head, 6);
}

function syncsafe(b: Uint8Array, at: number): number {
  return (
    (((b[at] ?? 0) & 0x7f) << 21) |
    (((b[at + 1] ?? 0) & 0x7f) << 14) |
    (((b[at + 2] ?? 0) & 0x7f) << 7) |
    ((b[at + 3] ?? 0) & 0x7f)
  );
}

function plain(b: Uint8Array, at: number, n: number): number {
  let v = 0;
  for (let i = 0; i < n; i++) v = v * 256 + (b[at + i] ?? 0);
  return v;
}

// "рассинхронизация": после каждого 0xFF записан лишний 0x00
function resync(b: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < b.length; i++) {
    const v = b[i] ?? 0;
    out.push(v);
    if (v === 0xff && b[i + 1] === 0x00) i++;
  }
  return Uint8Array.from(out);
}

const ENCODINGS = ['latin1', 'utf-16', 'utf-16be', 'utf-8'] as const;

function decode(b: Uint8Array, encoding: number): string {
  // "latin1" с буквами за пределами ASCII в русских файлах почти всегда на деле cp1251
  if (encoding === 0 && b.some((x) => x >= 0x80)) return new TextDecoder('windows-1251').decode(b);
  // UTF-16 с меткой порядка байтов: TextDecoder('utf-16') понимает только FF FE (младший
  // первым), а FE FF (старший первым) прочитал бы мусором - порядок берём из метки сами
  if (encoding === 1) {
    const be = b[0] === 0xfe && b[1] === 0xff;
    const le = b[0] === 0xff && b[1] === 0xfe;
    return new TextDecoder(be ? 'utf-16be' : 'utf-16le').decode(be || le ? b.subarray(2) : b);
  }
  const label = ENCODINGS[encoding] ?? 'latin1';
  return new TextDecoder(label).decode(b);
}

// конец строки в заданной кодировке: один нулевой байт или два для UTF-16
function textEnd(b: Uint8Array, from: number, encoding: number): number {
  const wide = encoding === 1 || encoding === 2;
  for (let i = from; i < b.length; i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return i;
  }
  return b.length;
}

function textFrame(body: Uint8Array): string {
  const encoding = body[0] ?? 0;
  const rest = body.subarray(1);
  // в 2.4 значений может быть несколько через ноль - берём первое
  const value = decode(rest.subarray(0, textEnd(rest, 0, encoding)), encoding);
  return value.replace(/^﻿/, '').trim();
}

function pictureFrame(body: Uint8Array, v22: boolean): Id3Tags['picture'] {
  const encoding = body[0] ?? 0;
  let at = 1;
  let mime: string;
  if (v22) {
    const fmt = decode(body.subarray(1, 4), 0).toLowerCase();
    mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
    at = 4;
  } else {
    const end = textEnd(body, at, 0);
    mime = decode(body.subarray(at, end), 0).toLowerCase() || 'image/jpeg';
    if (!mime.includes('/')) mime = `image/${mime === 'jpg' ? 'jpeg' : mime}`;
    // тип из файла идёт в Blob для экрана блокировки: только картинки
    if (!/^image\/[a-z0-9.+-]+$/.test(mime)) mime = 'image/jpeg';
    at = end + 1;
  }
  at += 1; // тип картинки
  const descEnd = textEnd(body, at, encoding);
  at = descEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
  const data = body.subarray(at);
  return data.length > 0 ? { mime, data } : undefined;
}

// Разбирает тег из начала файла (нужны первые id3Size байт).
export function parseId3(bytes: Uint8Array): Id3Tags | null {
  const size = id3Size(bytes);
  if (size === null) return null;
  const version = bytes[3] ?? 0;
  const flags = bytes[5] ?? 0;
  if (version < 2 || version > 4) return null;
  let tag = bytes.subarray(HEADER, Math.min(size, bytes.length));
  if (flags & 0x80 && version < 4) tag = resync(tag);
  let at = 0;
  // расширенный заголовок пропускаем
  if (flags & 0x40 && version > 2) {
    at = version === 4 ? syncsafe(tag, 0) : plain(tag, 0, 4) + 4;
  }
  const v22 = version === 2;
  const idLen = v22 ? 3 : 4;
  const headLen = v22 ? 6 : 10;
  const tags: Id3Tags = {};
  while (at + headLen <= tag.length) {
    const id = decode(tag.subarray(at, at + idLen), 0);
    if (!/^[A-Z0-9]+$/.test(id)) break; // дальше - заполнение нулями
    const len = v22
      ? plain(tag, at + 3, 3)
      : version === 4
        ? syncsafe(tag, at + 4)
        : plain(tag, at + 4, 4);
    const frameFlags = v22 ? 0 : (tag[at + 9] ?? 0);
    let body = tag.subarray(at + headLen, at + headLen + len);
    if (version === 4 && frameFlags & 0x02) body = resync(body);
    // в 2.4 перед данными может стоять их длина
    if (version === 4 && frameFlags & 0x01) body = body.subarray(4);
    at += headLen + len;
    if (len === 0) continue;
    if (id === 'TIT2' || id === 'TT2') tags.title = textFrame(body);
    else if (id === 'TPE1' || id === 'TP1') tags.artist = textFrame(body);
    else if (id === 'TALB' || id === 'TAL') tags.album = textFrame(body);
    else if ((id === 'APIC' || id === 'PIC') && !tags.picture) {
      const pic = pictureFrame(body, v22);
      if (pic) tags.picture = pic;
    }
  }
  return tags;
}

// Самые большие теги - с обложкой - бывают в несколько мегабайт: больше не читаем.
const MAX_TAG = 4 * 1024 * 1024;

// Теги MP3 по ссылке: сначала заголовок, потом сам тег (запросами с Range, файл целиком не
// качается). Нет тега или ошибка - null.
export async function fetchId3(url: string, signal?: AbortSignal): Promise<Id3Tags | null> {
  try {
    const head = await fetchRange(url, 0, HEADER - 1, signal);
    const size = id3Size(head);
    if (size === null || size > MAX_TAG) return null;
    return parseId3(await fetchRange(url, 0, size - 1, signal));
  } catch {
    return null;
  }
}

async function fetchRange(
  url: string,
  from: number,
  to: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${from}-${to}` },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // сервер без Range отдаёт файл целиком - берём нужный кусок
  return buf.subarray(0, to - from + 1);
}
