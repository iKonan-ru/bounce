/** Часть песни по разметке [Куплет], [Припев]: строка в скобках - заголовок части */
export interface LyricsPart {
  title: string;
  lines: string[];
}

/** Текст в поле ввода и выделение в нём */
export interface TextEdit {
  value: string;
  start: number;
  end: number;
}

/** Части песни на выбор при написании текста, в порядке, в каком они обычно идут */
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

/** Метка куплета */
const VERSE = 'Куплет';

/** Куплет с номером, написанным руками: [Куплет 3] */
const NUMBERED_VERSE_RE = /^Куплет\s+\d+$/;

/** Строка - метка части: [Припев] */
const PART_TITLE_RE = /^\[(.+)\]$/;

/** Переводы строк Windows */
const CRLF_RE = /\r\n/g;

/** Пробелы в конце текста перед курсором */
const TRAILING_SPACES_RE = /[ \t]+$/;

/** Пробелы в начале текста после курсора */
const LEADING_SPACES_RE = /^[ \t]+/;

/** В строке есть что-то кроме пробелов */
function checkIsFilledLine(line: string): boolean {
  return line.trim() !== '';
}

/** В части есть заголовок или текст */
function checkHasContent(part: LyricsPart): boolean {
  return Boolean(part.title) || part.lines.some(checkIsFilledLine);
}

/** Строки без пустых по краям */
function trimEmptyLines(lines: readonly string[]): string[] {
  const firstIndex = lines.findIndex(checkIsFilledLine);
  if (firstIndex === -1) {
    return [];
  }
  const lastIndex = lines.findLastIndex(checkIsFilledLine);
  return lines.slice(firstIndex, lastIndex + 1);
}

/** Части песни по меткам; пустые строки по краям частей убираются */
export function getLyricsParts(text: string): LyricsPart[] {
  const parts: LyricsPart[] = [];
  let current: LyricsPart = { title: '', lines: [] };
  for (const line of text.replace(CRLF_RE, '\n').split('\n')) {
    const titleMatch = line.trim().match(PART_TITLE_RE);
    if (!titleMatch) {
      current.lines.push(line);
      continue;
    }
    if (checkHasContent(current)) {
      parts.push(current);
    }
    current = { title: titleMatch[1]?.trim() ?? '', lines: [] };
  }
  if (checkHasContent(current)) {
    parts.push(current);
  }
  return parts.map((part) => ({ ...part, lines: trimEmptyLines(part.lines) }));
}

/** Заголовок части - куплет, с номером или без */
function checkIsVerse(title: string): boolean {
  return title === VERSE || NUMBERED_VERSE_RE.test(title);
}

/**
 * Куплеты без номера нумеруются по порядку, если их больше одного: [Куплет] -> "Куплет 2"
 *
 * Номер, написанный руками ([Куплет 3]), остаётся как есть
 */
export function numberVerses(parts: readonly LyricsPart[]): LyricsPart[] {
  const verseCount = parts.filter((part) => checkIsVerse(part.title)).length;
  let verseNumber = 0;
  return parts.map((part) => {
    if (!checkIsVerse(part.title)) {
      return part;
    }
    verseNumber += 1;
    const shouldNumber = part.title === VERSE && verseCount > 1;
    if (!shouldNumber) {
      return part;
    }
    return { ...part, title: `${VERSE} ${verseNumber}` };
  });
}

/** Текст без меток частей: части через пустую строку - для копирования и отправки */
export function getPlainLyrics(text: string): string {
  return getLyricsParts(text)
    .map((part) => part.lines.join('\n'))
    .filter(checkIsFilledLine)
    .join('\n\n');
}

/** Переводы строки перед меткой части, чтобы перед ней осталась ровно одна пустая строка */
function getLeadBeforeTag(before: string): string {
  if (before === '' || before.endsWith('\n\n')) {
    return '';
  }
  if (before.endsWith('\n')) {
    return '\n';
  }
  return '\n\n';
}

/**
 * Вставить метку части отдельной строкой на месте курсора
 *
 * Перед ней - пустая строка, после - курсор на новой строке, чтобы сразу писать текст части
 */
export function insertTag(edit: TextEdit, tag: string): TextEdit {
  const before = edit.value.slice(0, edit.start).replace(TRAILING_SPACES_RE, '');
  const after = edit.value.slice(edit.end).replace(LEADING_SPACES_RE, '');
  const head = `${getLeadBeforeTag(before)}[${tag}]\n`;
  const value = before + head + after;
  const cursor = before.length + head.length;
  return { value, start: cursor, end: cursor };
}
