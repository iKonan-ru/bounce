// Тональность песни: тоника и лад. Хранится коротко, как пишут музыканты: "C", "F#", "Am", "Bbm".
import {
  TONICS,
  MINOR_NAME,
  KEY_RE,
  ENHARMONIC,
  MINOR_MODES,
  RU_NOTE,
} from '../constants/keys';
import type { Tonic, SongKey } from '../types/keys';

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
