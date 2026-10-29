import type { TONICS } from '../constants/keys';

export type Tonic = (typeof TONICS)[number];

/** Тональность: тоника и лад */
export interface SongKey {
  tonic: Tonic;
  isMinor: boolean;
}
