// Тональность песни: тоника и лад. Хранится коротко, как пишут музыканты: "C", "F#", "Am", "Bbm".

export const TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export type Tonic = (typeof TONICS)[number];
export type SongKey = { tonic: Tonic; minor: boolean };

// та же нота под другим именем - к принятому написанию
const ENHARMONIC: Record<string, Tonic> = {
  Db: 'C#',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
  Cb: 'B',
  'B#': 'C',
  Fb: 'E',
  'E#': 'F',
};

const RU_NOTE: Record<Tonic, string> = {
  C: 'до',
  'C#': 'до-диез',
  D: 'ре',
  Eb: 'ми-бемоль',
  E: 'ми',
  F: 'фа',
  'F#': 'фа-диез',
  G: 'соль',
  Ab: 'ля-бемоль',
  A: 'ля',
  Bb: 'си-бемоль',
  B: 'си',
};

// в миноре принято G#m, а не Abm
const MINOR_NAME: Partial<Record<Tonic, string>> = { Ab: 'G#' };

function isTonic(v: string): v is Tonic {
  return TONICS.some((t) => t === v);
}

export function formatKey(k: SongKey): string {
  const name = k.minor ? (MINOR_NAME[k.tonic] ?? k.tonic) : k.tonic;
  return k.minor ? `${name}m` : name;
}

// Разбирает записанную тональность: "Am", "a minor", "F# maj", "Dbm"; иное - null.
export function parseKey(raw: string): SongKey | null {
  const m = raw.trim().match(/^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major|dur|moll)?$/);
  if (!m) return null;
  const note = `${(m[1] ?? '').toUpperCase()}${m[2] ?? ''}`;
  const tonic = isTonic(note) ? note : ENHARMONIC[note];
  if (!tonic) return null;
  const mode = (m[3] ?? '').toLowerCase();
  return { tonic, minor: mode === 'm' || mode === 'min' || mode === 'minor' || mode === 'moll' };
}

// "ля минор" - подсказка по-русски
export function keyName(k: SongKey): string {
  return `${RU_NOTE[k.tonic]} ${k.minor ? 'минор' : 'мажор'}`;
}
