// Части песни по разметке [Куплет], [Припев]: строка в скобках - заголовок части.
export type LyricsPart = { title: string; lines: string[] };

export function lyricsParts(text: string): LyricsPart[] {
  const parts: LyricsPart[] = [];
  let current: LyricsPart = { title: '', lines: [] };
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const head = raw.trim().match(/^\[(.+)\]$/);
    if (head) {
      if (current.title || current.lines.some((l) => l.trim())) parts.push(current);
      current = { title: head[1]?.trim() ?? '', lines: [] };
    } else {
      current.lines.push(raw);
    }
  }
  if (current.title || current.lines.some((l) => l.trim())) parts.push(current);
  // пустые строки по краям части не нужны
  return parts.map((p) => {
    const lines = [...p.lines];
    while (lines.length && !lines[0]?.trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop();
    return { ...p, lines };
  });
}

// Части песни на выбор при написании текста, в порядке, в каком они обычно идут.
export const LYRICS_TAGS = [
  'Интро',
  'Куплет',
  'Пред-припев',
  'Припев',
  'Пост-припев',
  'Бридж',
  'Проигрыш',
  'Соло',
  'Брейк',
  'Аутро',
] as const;

const VERSE = 'Куплет';

// Куплеты без номера нумеруются по порядку, если их больше одного: [Куплет] -> "Куплет 2".
// Номер, написанный руками ([Куплет 3]), остаётся как есть.
export function numberVerses(parts: ReadonlyArray<LyricsPart>): LyricsPart[] {
  const isVerse = (t: string) => t === VERSE || /^Куплет\s+\d+$/.test(t);
  const total = parts.filter((p) => isVerse(p.title)).length;
  let n = 0;
  return parts.map((p) => {
    if (!isVerse(p.title)) return p;
    n += 1;
    return p.title === VERSE && total > 1 ? { ...p, title: `${VERSE} ${n}` } : p;
  });
}

// Текст без меток частей: части через пустую строку - для копирования и отправки.
export function plainLyrics(text: string): string {
  return lyricsParts(text)
    .map((p) => p.lines.join('\n'))
    .filter((t) => t.trim() !== '')
    .join('\n\n');
}

export type TextEdit = { value: string; start: number; end: number };

// Вставить метку части отдельной строкой на месте курсора: перед ней - пустая строка, после -
// курсор на новой строке, чтобы сразу писать текст части.
export function insertTag(e: TextEdit, tag: string): TextEdit {
  const before = e.value.slice(0, e.start).replace(/[ \t]+$/, '');
  const after = e.value.slice(e.end).replace(/^[ \t]+/, '');
  const lead =
    before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const head = `${lead}[${tag}]\n`;
  const value = before + head + after;
  const cursor = before.length + head.length;
  return { value, start: cursor, end: cursor };
}
