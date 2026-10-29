// Простая разметка заметок. Текст хранится как есть, разметка разбирается при показе:
//   **жирный**  *курсив* или _курсив_  __подчёркнутый__  ~~зачёркнутый~~  `код`
//   [подпись](https://...)  и просто ссылки https://... или www....
//   @логин - упоминание человека, при показе - его имя
//   строки "- " / "* " / буллет (U+2022) - список, "1. " / "1) " - нумерованный, "> " - цитата
// HTML не используется: разбор даёт дерево, которое рисует React (components/markup.tsx).

/** Вид узла строки */
export enum InlineKind {
  Text = 'text',
  Bold = 'bold',
  Italic = 'italic',
  Underline = 'underline',
  Strike = 'strike',
  Code = 'code',
  Link = 'link',
  Mention = 'mention',
}

/** Оформление текста */
type StyleKind = InlineKind.Bold | InlineKind.Italic | InlineKind.Underline | InlineKind.Strike;

/** Узел строки: текст, оформление, код, ссылка или упоминание */
export type Inline =
  | { kind: InlineKind.Text; text: string }
  | { kind: StyleKind; children: Inline[] }
  | { kind: InlineKind.Code; text: string }
  | { kind: InlineKind.Link; url: string; children: Inline[] | null }
  | { kind: InlineKind.Mention; username: string };

/** Вид блока текста */
export enum BlockKind {
  Paragraph = 'p',
  List = 'ul',
  /** Нумерованный список */
  OrderedList = 'ol',
  Quote = 'quote',
}

/** Блок текста: абзац, список, нумерованный список или цитата */
export type Block =
  | { kind: BlockKind.Paragraph; lines: Inline[][] }
  | { kind: BlockKind.List; items: Inline[][] }
  | { kind: BlockKind.OrderedList; start: number; items: Inline[][] }
  | { kind: BlockKind.Quote; lines: Inline[][] };

/** Разобранное совпадение правила: узел и сколько текста он занял */
interface ParsedMatch {
  length: number;
  node: Inline;
}

/** Найденный узел и где он начинается */
interface Found extends ParsedMatch {
  index: number;
}

/** Правило разметки строки */
interface Rule {
  pattern: RegExp;
  /** Граница: символы вокруг совпадения не должны быть буквой или цифрой (snake_case, 2*3*4) */
  hasWordBoundary?: boolean;
  /** Узел по совпадению; null - совпадение остаётся текстом */
  parse: (match: RegExpExecArray) => ParsedMatch | null;
}

/** Строки блока и индекс строки после блока */
interface CollectedLines {
  items: Inline[][];
  nextIndex: number;
}

/** Ссылка в тексте */
type Link = Extract<Inline, { kind: InlineKind.Link }>;

/** Пунктуация в конце ссылки: остаётся текстом */
const URL_TAIL_RE = /[.,;:!?'")\]\u00BB]+$/;

/** Буква или цифра: граница слова для правил с hasWordBoundary */
const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/** Строка маркированного списка */
const UL_LINE_RE = /^\s*[-*\u2022]\s+(.*)$/;

/** Строка нумерованного списка */
const OL_LINE_RE = /^\s*(\d{1,3})[.)]\s+(.*)$/;

/** Строка цитаты */
const QUOTE_LINE_RE = /^\s*>\s?(.*)$/;

/** Строки, с которых начинается новый блок */
const BLOCK_START_RES: readonly RegExp[] = [UL_LINE_RE, OL_LINE_RE, QUOTE_LINE_RE];

/** Переводы строк Windows */
const CRLF_RE = /\r\n/g;

/** Адрес без протокола начинается с www. */
const WWW_PREFIX = 'www.';

/** Разрешённые протоколы ссылок */
const SAFE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/** Начало домена www. */
const WWW_HOST_RE = /^www\./;

/** Длинная часть пути в подписи ссылки обрезается */
const LINK_SEGMENT_MAX = 18;

/** Разделитель сервиса и вида страницы в подписи ссылки */
const LINK_KIND_SEPARATOR = ' \u00B7 ';

/** Только http(s): javascript: и прочее остаётся текстом */
export function getSafeUrl(raw: string): string | null {
  const url = raw.startsWith(WWW_PREFIX) ? `https://${raw}` : raw;
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Совпадение целиком становится узлом node */
function getWholeMatch(match: RegExpExecArray, node: Inline): ParsedMatch {
  return { length: match[0].length, node };
}

/** Разбор оформления: узел с разобранным содержимым из первой группы */
function createStyledParser(kind: StyleKind): (match: RegExpExecArray) => ParsedMatch {
  return (match) => getWholeMatch(match, { kind, children: parseInline(match[1] ?? '') });
}

/** Ссылка вида [подпись](адрес); небезопасный адрес остаётся текстом */
function parseLabeledLink(match: RegExpExecArray): ParsedMatch | null {
  const url = getSafeUrl(match[2] ?? '');
  if (!url) {
    return null;
  }
  const link: Link = { kind: InlineKind.Link, url, children: parseInline(match[1] ?? '') };
  return getWholeMatch(match, link);
}

/** Просто ссылка в тексте: хвостовая пунктуация остаётся текстом */
function parseBareLink(match: RegExpExecArray): ParsedMatch | null {
  const raw = match[0].replace(URL_TAIL_RE, '');
  const url = getSafeUrl(raw);
  if (!url) {
    return null;
  }
  const link: Link = { kind: InlineKind.Link, url, children: null };
  return { length: raw.length, node: link };
}

/** Правила разметки строки: при равном начале побеждает правило выше */
const RULES: readonly Rule[] = [
  {
    pattern: /`([^`\n]+)`/g,
    parse: (match) => getWholeMatch(match, { kind: InlineKind.Code, text: match[1] ?? '' }),
  },
  { pattern: /\[([^\]\n]+)\]\(([^)\s]+)\)/g, parse: parseLabeledLink },
  { pattern: /(?:https?:\/\/|www\.)[^\s<>]+/g, parse: parseBareLink },
  // упоминание @логин (lib/mentions.ts); не внутри слова и не в почте
  {
    pattern: /@([a-z0-9][a-z0-9_.-]{1,30}[a-z0-9])/g,
    hasWordBoundary: true,
    parse: (match) => getWholeMatch(match, { kind: InlineKind.Mention, username: match[1] ?? '' }),
  },
  { pattern: /\*\*(?=\S)([\s\S]*?\S)\*\*/g, parse: createStyledParser(InlineKind.Bold) },
  {
    pattern: /__(?=\S)([\s\S]*?\S)__/g,
    hasWordBoundary: true,
    parse: createStyledParser(InlineKind.Underline),
  },
  { pattern: /~~(?=\S)([\s\S]*?\S)~~/g, parse: createStyledParser(InlineKind.Strike) },
  {
    pattern: /\*(?=[^\s*])([^*\n]*?[^\s*])\*/g,
    hasWordBoundary: true,
    parse: createStyledParser(InlineKind.Italic),
  },
  {
    pattern: /_(?=[^\s_])([^_\n]*?[^\s_])_/g,
    hasWordBoundary: true,
    parse: createStyledParser(InlineKind.Italic),
  },
];

/** Совпадение стоит вплотную к букве или цифре */
function checkIsInsideWord(text: string, match: RegExpExecArray): boolean {
  const charBefore = text[match.index - 1] ?? '';
  const charAfter = text[match.index + match[0].length] ?? '';
  return [charBefore, charAfter].some((char) => WORD_CHAR_RE.test(char));
}

/** Первое совпадение правила начиная с позиции from */
function findMatchFrom(text: string, rule: Rule, from: number): Found | null {
  rule.pattern.lastIndex = from;
  for (let match = rule.pattern.exec(text); match; match = rule.pattern.exec(text)) {
    if (rule.hasWordBoundary && checkIsInsideWord(text, match)) {
      rule.pattern.lastIndex = match.index + 1;
      continue;
    }
    const parsed = rule.parse(match);
    if (parsed) {
      return { index: match.index, ...parsed };
    }
  }
  return null;
}

/** Ближайшее совпадение всех правил; при равенстве - правило выше по списку */
function findNearest(text: string, from: number): Found | null {
  let nearest: Found | null = null;
  for (const rule of RULES) {
    const found = findMatchFrom(text, rule, from);
    if (!found) {
      continue;
    }
    if (!nearest || found.index < nearest.index) {
      nearest = found;
    }
  }
  return nearest;
}

/** Разбор строки на узлы */
export function parseInline(text: string): Inline[] {
  const nodes: Inline[] = [];
  let position = 0;
  while (position < text.length) {
    const nearest = findNearest(text, position);
    if (!nearest) {
      break;
    }
    if (nearest.index > position) {
      nodes.push({ kind: InlineKind.Text, text: text.slice(position, nearest.index) });
    }
    nodes.push(nearest.node);
    position = nearest.index + nearest.length;
  }
  if (position < text.length) {
    nodes.push({ kind: InlineKind.Text, text: text.slice(position) });
  }
  return nodes;
}

/** Подряд идущие строки блока по шаблону; содержимое строки - группа group */
function collectLines(
  lines: readonly string[],
  from: number,
  pattern: RegExp,
  group: number,
): CollectedLines {
  const items: Inline[][] = [];
  let index = from;
  for (
    let match = pattern.exec(lines[index] ?? '');
    match;
    match = pattern.exec(lines[index] ?? '')
  ) {
    if (index >= lines.length) {
      break;
    }
    items.push(parseInline(match[group] ?? ''));
    index++;
  }
  return { items, nextIndex: index };
}

/** Строка заканчивает абзац: пустая или начало другого блока */
function checkIsParagraphBreak(line: string): boolean {
  return line.trim() === '' || BLOCK_START_RES.some((pattern) => pattern.test(line));
}

/** Разбор текста на блоки */
export function parseMarkup(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(CRLF_RE, '\n').split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      index++;
      continue;
    }
    if (UL_LINE_RE.test(line)) {
      const { items, nextIndex } = collectLines(lines, index, UL_LINE_RE, 1);
      blocks.push({ kind: BlockKind.List, items });
      index = nextIndex;
      continue;
    }
    const olMatch = OL_LINE_RE.exec(line);
    if (olMatch) {
      const { items, nextIndex } = collectLines(lines, index, OL_LINE_RE, 2);
      blocks.push({ kind: BlockKind.OrderedList, start: Number(olMatch[1]), items });
      index = nextIndex;
      continue;
    }
    if (QUOTE_LINE_RE.test(line)) {
      const { items, nextIndex } = collectLines(lines, index, QUOTE_LINE_RE, 1);
      blocks.push({ kind: BlockKind.Quote, lines: items });
      index = nextIndex;
      continue;
    }
    const paragraph: Inline[][] = [];
    while (index < lines.length && !checkIsParagraphBreak(lines[index] ?? '')) {
      paragraph.push(parseInline(lines[index] ?? ''));
      index++;
    }
    blocks.push({ kind: BlockKind.Paragraph, lines: paragraph });
  }
  return blocks;
}

/** Сервис ссылки: подпись и вид страницы по пути */
interface LinkService {
  host: RegExp;
  name: string;
  /** Что это за страница по частям пути */
  getKind?: (path: string[]) => string | undefined;
}

/** Что это за страница на YouTube по первой части пути */
const YOUTUBE_KIND: Record<string, string> = { shorts: 'Shorts', playlist: 'плейлист' };

/** Что это за страница в Spotify */
const SPOTIFY_KIND: Record<string, string> = {
  track: 'трек',
  album: 'альбом',
  playlist: 'плейлист',
  artist: 'артист',
};

/** Что это за страница в Яндекс Музыке */
const YANDEX_MUSIC_KIND: Record<string, string> = { album: 'альбом', artist: 'артист' };

/** Что это за страница в Instagram; остальное - как есть */
const INSTAGRAM_KIND: Record<string, string> = { reel: 'Reels', reels: 'Reels', p: 'пост' };

/** Сколько частей пути GitHub показывать: владелец и репозиторий */
const GITHUB_PATH_PARTS = 2;

/** Первая часть пути */
function getFirstPart(path: string[]): string {
  return path[0] ?? '';
}

/** Канал или профиль по @имени - как есть */
function getProfileName(path: string[]): string | undefined {
  const first = getFirstPart(path);
  return first.startsWith('@') ? first : undefined;
}

/** Вид страницы на YouTube; канал - как есть (@имя) */
function getYoutubeKind(path: string[]): string {
  return getProfileName(path) ?? YOUTUBE_KIND[getFirstPart(path)] ?? 'видео';
}

/** Вид страницы в Яндекс Музыке: трек может быть и внутри альбома (album/1/track/2) */
function getYandexMusicKind(path: string[]): string | undefined {
  if (path.includes('track')) {
    return 'трек';
  }
  return YANDEX_MUSIC_KIND[getFirstPart(path)];
}

/** Вид страницы в VK: clip-123, video-123 */
function getVkKind(path: string[]): string | undefined {
  const first = getFirstPart(path);
  if (first.startsWith('clip')) {
    return 'клип';
  }
  if (first.startsWith('video')) {
    return 'видео';
  }
  return undefined;
}

/** Вид страницы в Suno */
function getSunoKind(path: string[]): string | undefined {
  return getFirstPart(path) === 'song' ? 'трек' : undefined;
}

/** Репозиторий на GitHub: владелец/имя */
function getGithubKind(path: string[]): string | undefined {
  return path.slice(0, GITHUB_PATH_PARTS).join('/') || undefined;
}

/** Короткая подпись ссылки: сервис и что это, иначе домен и начало пути */
const LINK_SERVICES: readonly LinkService[] = [
  { host: /^(m\.)?youtube\.com$|^youtu\.be$/, name: 'YouTube', getKind: getYoutubeKind },
  { host: /^music\.youtube\.com$/, name: 'YouTube Music' },
  {
    host: /^open\.spotify\.com$/,
    name: 'Spotify',
    getKind: (path) => SPOTIFY_KIND[getFirstPart(path)],
  },
  { host: /^music\.yandex\.(ru|com|by|kz)$/, name: 'Яндекс Музыка', getKind: getYandexMusicKind },
  { host: /^music\.apple\.com$/, name: 'Apple Music' },
  { host: /^(m\.)?soundcloud\.com$/, name: 'SoundCloud', getKind: (path) => path[0] },
  { host: /^band\.link$/, name: 'Bandlink' },
  { host: /^(disk\.yandex\.(ru|com)|yadi\.sk)$/, name: 'Яндекс Диск' },
  { host: /^drive\.google\.com$/, name: 'Google Диск' },
  { host: /^docs\.google\.com$/, name: 'Google Документы' },
  { host: /^(www\.)?dropbox\.com$/, name: 'Dropbox' },
  {
    host: /^instagram\.com$/,
    name: 'Instagram',
    getKind: (path) => INSTAGRAM_KIND[getFirstPart(path)] ?? path[0],
  },
  { host: /^(vm\.)?tiktok\.com$/, name: 'TikTok', getKind: getProfileName },
  { host: /^(m\.)?vk\.(com|ru)$/, name: 'VK', getKind: getVkKind },
  { host: /^t\.me$/, name: 'Telegram', getKind: (path) => path[0] },
  { host: /^(suno\.com|suno\.ai)$/, name: 'Suno', getKind: getSunoKind },
  { host: /^github\.com$/, name: 'GitHub', getKind: getGithubKind },
];

/** Часть пути ссылки без %-кодирования; не раскодировалась - как есть */
function decodePathPart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/** Подпись ссылки для сервиса: сервис и вид страницы через точку (U+00B7) или только сервис */
function getServiceLabel(service: LinkService, path: string[]): string {
  if (!service.getKind) {
    return service.name;
  }
  const kind = service.getKind(path);
  if (!kind) {
    return service.name;
  }
  return `${service.name}${LINK_KIND_SEPARATOR}${kind}`;
}

/** Часть пути не длиннее LINK_SEGMENT_MAX знаков, длинная - с многоточием */
function getShortPart(part: string): string {
  if (part.length <= LINK_SEGMENT_MAX) {
    return part;
  }
  return `${part.slice(0, LINK_SEGMENT_MAX - 1)}...`;
}

/** Короткая подпись ссылки: сервис и что это, иначе домен и начало пути */
export function getLinkLabel(href: string): string {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return href;
  }
  const host = parsed.hostname.replace(WWW_HOST_RE, '');
  const path = parsed.pathname.split('/').filter(Boolean).map(decodePathPart);
  const service = LINK_SERVICES.find((linkService) => linkService.host.test(host));
  if (service) {
    return getServiceLabel(service, path);
  }
  const first = path[0];
  if (!first) {
    return host;
  }
  const shortFirst = getShortPart(first);
  if (path.length > 1) {
    return `${host}/${shortFirst}/...`;
  }
  return `${host}/${shortFirst}`;
}
