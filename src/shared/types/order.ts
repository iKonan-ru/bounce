import type { Collections } from '../api/pb-types';

/** Элемент с местом в ручном порядке списка */
export interface Ordered {
  position: number;
}

/** Запись с местом в ручном порядке списка */
export interface Positioned extends Ordered {
  id: string;
}

/** Коллекции с ручным порядком записей */
export type OrderedCollection =
  | typeof Collections.SongStages
  | typeof Collections.StageTemplates
  | typeof Collections.Songs;
