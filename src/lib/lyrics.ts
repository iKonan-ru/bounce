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
