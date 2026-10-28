// Простая разметка заметок. Текст хранится как есть, разметка разбирается при показе:
//   **жирный**  *курсив* или _курсив_  __подчёркнутый__  ~~зачёркнутый~~  `код`
//   [подпись](https://...)  и просто ссылки https://... или www....
//   @логин - упоминание человека, при показе - его имя
//   строки "- " / "* " / "• " - список, "1. " / "1) " - нумерованный, "> " - цитата
// HTML не используется: разбор даёт дерево, которое рисует React (components/markup.tsx).

export type Inline =
  | { t: 'text'; text: string }
  | { t: 'bold' | 'italic' | 'underline' | 'strike'; children: Inline[] }
  | { t: 'code'; text: string }
  | { t: 'link'; url: string; children: Inline[] | null }
  | { t: 'mention'; username: string };

export type Block =
  | { t: 'p'; lines: Inline[][] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; start: number; items: Inline[][] }
  | { t: 'quote'; lines: Inline[][] };

type Rule = {
  re: RegExp;
  // граница: символ перед совпадением не должен быть буквой или цифрой (snake_case, 2*3*4)
  wordBoundary?: boolean;
  make: (m: RegExpExecArray) => Inline | null;
};

const URL_TAIL = /[.,;:!?'")\]»]+$/;

// только http(s): javascript: и прочее остаётся текстом
export function safeUrl(raw: string): string | null {
  const url = raw.startsWith('www.') ? `https://${raw}` : raw;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

const RULES: Rule[] = [
  { re: /`([^`\n]+)`/g, make: (m) => ({ t: 'code', text: m[1] ?? '' }) },
  {
    re: /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    make: (m) => {
      const url = safeUrl(m[2] ?? '');
      return url ? { t: 'link', url, children: parseInline(m[1] ?? '') } : null;
    },
  },
  {
    re: /(?:https?:\/\/|www\.)[^\s<>]+/g,
    make: () => null, // обрабатывается отдельно: хвостовая пунктуация остаётся текстом
  },
  // упоминание @логин (lib/mentions.ts); не внутри слова и не в почте
  {
    re: /@([a-z0-9][a-z0-9_.-]{1,30}[a-z0-9])/g,
    wordBoundary: true,
    make: (m) => ({ t: 'mention', username: m[1] ?? '' }),
  },
  {
    re: /\*\*(?=\S)([\s\S]*?\S)\*\*/g,
    make: (m) => ({ t: 'bold', children: parseInline(m[1] ?? '') }),
  },
  {
    re: /__(?=\S)([\s\S]*?\S)__/g,
    wordBoundary: true,
    make: (m) => ({ t: 'underline', children: parseInline(m[1] ?? '') }),
  },
  {
    re: /~~(?=\S)([\s\S]*?\S)~~/g,
    make: (m) => ({ t: 'strike', children: parseInline(m[1] ?? '') }),
  },
  {
    re: /\*(?=[^\s*])([^*\n]*?[^\s*])\*/g,
    wordBoundary: true,
    make: (m) => ({ t: 'italic', children: parseInline(m[1] ?? '') }),
  },
  {
    re: /_(?=[^\s_])([^_\n]*?[^\s_])_/g,
    wordBoundary: true,
    make: (m) => ({ t: 'italic', children: parseInline(m[1] ?? '') }),
  },
];

const URL_RULE = 2;
const WORD = /[\p{L}\p{N}]/u;

type Found = { index: number; length: number; node: Inline };

function findFrom(text: string, ruleIndex: number, from: number): Found | null {
  const rule = RULES[ruleIndex];
  if (!rule) return null;
  rule.re.lastIndex = from;
  for (let m = rule.re.exec(text); m; m = rule.re.exec(text)) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    const after = text[m.index + m[0].length] ?? '';
    if (rule.wordBoundary && ((before && WORD.test(before)) || (after && WORD.test(after)))) {
      rule.re.lastIndex = m.index + 1;
      continue;
    }
    if (ruleIndex === URL_RULE) {
      const raw = m[0].replace(URL_TAIL, '');
      const url = safeUrl(raw);
      if (url)
        return { index: m.index, length: raw.length, node: { t: 'link', url, children: null } };
      continue;
    }
    const node = rule.make(m);
    if (node) return { index: m.index, length: m[0].length, node };
  }
  return null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let pos = 0;
  while (pos < text.length) {
    // ближайшее совпадение; при равенстве - правило выше по списку
    let best: Found | null = null;
    for (let i = 0; i < RULES.length; i++) {
      const f = findFrom(text, i, pos);
      if (f && (!best || f.index < best.index)) best = f;
    }
    if (!best) break;
    if (best.index > pos) out.push({ t: 'text', text: text.slice(pos, best.index) });
    out.push(best.node);
    pos = best.index + best.length;
  }
  if (pos < text.length) out.push({ t: 'text', text: text.slice(pos) });
  return out;
}

const UL = /^\s*[-*•]\s+(.*)$/;
const OL = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;

export function parseMarkup(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (UL.test(line)) {
      const items: Inline[][] = [];
      for (let m = UL.exec(lines[i] ?? ''); m && i < lines.length; m = UL.exec(lines[i] ?? '')) {
        items.push(parseInline(m[1] ?? ''));
        i++;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }
    const ol = OL.exec(line);
    if (ol) {
      const items: Inline[][] = [];
      for (let m = OL.exec(lines[i] ?? ''); m && i < lines.length; m = OL.exec(lines[i] ?? '')) {
        items.push(parseInline(m[2] ?? ''));
        i++;
      }
      blocks.push({ t: 'ol', start: Number(ol[1]), items });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: Inline[][] = [];
      for (
        let m = QUOTE.exec(lines[i] ?? '');
        m && i < lines.length;
        m = QUOTE.exec(lines[i] ?? '')
      ) {
        quoted.push(parseInline(m[1] ?? ''));
        i++;
      }
      blocks.push({ t: 'quote', lines: quoted });
      continue;
    }
    const para: Inline[][] = [];
    while (i < lines.length) {
      const l = lines[i] ?? '';
      if (l.trim() === '' || UL.test(l) || OL.test(l) || QUOTE.test(l)) break;
      para.push(parseInline(l));
      i++;
    }
    blocks.push({ t: 'p', lines: para });
  }
  return blocks;
}

// Короткая подпись ссылки: сервис и что это, иначе домен и начало пути.
const SERVICES: { host: RegExp; name: string; kind?: (path: string[]) => string | undefined }[] = [
  {
    host: /^(m\.)?youtube\.com$|^youtu\.be$/,
    name: 'YouTube',
    kind: (p) =>
      p[0] === 'shorts'
        ? 'Shorts'
        : p[0] === 'playlist'
          ? 'плейлист'
          : p[0]?.startsWith('@')
            ? p[0]
            : 'видео',
  },
  { host: /^music\.youtube\.com$/, name: 'YouTube Music' },
  {
    host: /^open\.spotify\.com$/,
    name: 'Spotify',
    kind: (p) =>
      ({ track: 'трек', album: 'альбом', playlist: 'плейлист', artist: 'артист' })[p[0] ?? ''],
  },
  {
    host: /^music\.yandex\.(ru|com|by|kz)$/,
    name: 'Яндекс Музыка',
    kind: (p) =>
      p.includes('track')
        ? 'трек'
        : p[0] === 'album'
          ? 'альбом'
          : p[0] === 'artist'
            ? 'артист'
            : undefined,
  },
  { host: /^music\.apple\.com$/, name: 'Apple Music' },
  { host: /^(m\.)?soundcloud\.com$/, name: 'SoundCloud', kind: (p) => p[0] },
  { host: /^band\.link$/, name: 'Bandlink' },
  { host: /^(disk\.yandex\.(ru|com)|yadi\.sk)$/, name: 'Яндекс Диск' },
  { host: /^drive\.google\.com$/, name: 'Google Диск' },
  { host: /^docs\.google\.com$/, name: 'Google Документы' },
  { host: /^(www\.)?dropbox\.com$/, name: 'Dropbox' },
  {
    host: /^instagram\.com$/,
    name: 'Instagram',
    kind: (p) => (p[0] === 'reel' || p[0] === 'reels' ? 'Reels' : p[0] === 'p' ? 'пост' : p[0]),
  },
  {
    host: /^(vm\.)?tiktok\.com$/,
    name: 'TikTok',
    kind: (p) => (p[0]?.startsWith('@') ? p[0] : undefined),
  },
  {
    host: /^(m\.)?vk\.(com|ru)$/,
    name: 'VK',
    kind: (p) =>
      p[0]?.startsWith('clip') ? 'клип' : p[0]?.startsWith('video') ? 'видео' : undefined,
  },
  { host: /^t\.me$/, name: 'Telegram', kind: (p) => p[0] },
  {
    host: /^(suno\.com|suno\.ai)$/,
    name: 'Suno',
    kind: (p) => (p[0] === 'song' ? 'трек' : undefined),
  },
  { host: /^github\.com$/, name: 'GitHub', kind: (p) => p.slice(0, 2).join('/') || undefined },
];

export function linkLabel(href: string): string {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return href;
  }
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  const service = SERVICES.find((s) => s.host.test(host));
  if (service) {
    const kind = service.kind?.(path);
    return kind ? `${service.name} · ${kind}` : service.name;
  }
  const first = path[0];
  if (!first) return host;
  const short = first.length > 18 ? `${first.slice(0, 17)}...` : first;
  return path.length > 1 ? `${host}/${short}/...` : `${host}/${short}`;
}
