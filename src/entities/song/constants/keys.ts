import type { Tonic } from '../types/keys';

/** Тоники в принятом написании */
export const TONICS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** Та же нота под другим именем - к принятому написанию */
export const ENHARMONIC: Record<string, Tonic> = {
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
export const RU_NOTE: Record<Tonic, string> = {
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
export const MINOR_NAME: Partial<Record<Tonic, string>> = { Ab: 'G#' };

/** Записанная тональность: нота, знак и лад словом или буквой */
export const KEY_RE = /^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major|dur|moll)?$/;

/** Обозначения минора */
export const MINOR_MODES: ReadonlySet<string> = new Set([
  'm',
  'min',
  'minor',
  'moll',
]);
