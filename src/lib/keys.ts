// Тональность песни: тоника и лад. Хранится коротко, как пишут музыканты: "C", "F#", "Am", "Bbm".

/** Тоники в принятом написании */
export const TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type Tonic = (typeof TONICS)[number];

/** Тональность: тоника и лад */
export interface SongKey {
  tonic: Tonic;
  isMinor: boolean;
}

/** Та же нота под другим именем - к принятому написанию */
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

/** Названия нот по-русски */
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

/** В миноре принято G#m, а не Abm */
const MINOR_NAME: Partial<Record<Tonic, string>> = { Ab: 'G#' };

/** Записанная тональность: нота, знак и лад словом или буквой */
const KEY_RE = /^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major|dur|moll)?$/;

/** Обозначения минора */
const MINOR_MODES: ReadonlySet<string> = new Set(['m', 'min', 'minor', 'moll']);

/** Строка - тоника в принятом написании */
function checkIsTonic(value: string): value is Tonic {
  return TONICS.some((tonic) => tonic === value);
}

/** Короткая запись тональности: "Am", "F#", "G#m" */
export function getKeyLabel(songKey: SongKey): string {
  if (!songKey.isMinor) {
    return songKey.tonic;
  }
  const minorTonic = MINOR_NAME[songKey.tonic] ?? songKey.tonic;
  return `${minorTonic}m`;
}

/** Разбирает записанную тональность: "Am", "a minor", "F# maj", "Dbm"; иное - null */
export function parseKey(raw: string): SongKey | null {
  const match = raw.trim().match(KEY_RE);
  if (!match) {
    return null;
  }
  const letter = (match[1] ?? '').toUpperCase();
  const note = `${letter}${match[2] ?? ''}`;
  const tonic = checkIsTonic(note) ? note : ENHARMONIC[note];
  if (!tonic) {
    return null;
  }
  const mode = (match[3] ?? '').toLowerCase();
  return { tonic, isMinor: MINOR_MODES.has(mode) };
}

/** Тональность по-русски для подсказки: "ля минор" */
export function getKeyHint(songKey: SongKey): string {
  const modeName = songKey.isMinor ? 'минор' : 'мажор';
  return `${RU_NOTE[songKey.tonic]} ${modeName}`;
}
