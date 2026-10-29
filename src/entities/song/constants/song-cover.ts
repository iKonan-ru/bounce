import { SongCoverSize } from '../types/sizes';

/** Уменьшенная копия обложки песни по размеру */
export const SONG_COVER_THUMB: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: '96x96',
  [SongCoverSize.Large]: '600x600',
};

/** Значок пластинки без обложки по размеру */
export const SONG_COVER_ICON_CLASS_NAME: Record<SongCoverSize, string> = {
  [SongCoverSize.Small]: 'size-5',
  [SongCoverSize.Large]: 'size-10',
};
