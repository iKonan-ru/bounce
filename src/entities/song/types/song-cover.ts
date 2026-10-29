import type { PendingImage } from '@/shared/types';
import type { SongCoverSize } from './sizes';
import type { Song } from './song';

/** Пропсы обложки песни */
export interface SongCoverProps {
  song: Song;
  size?: SongCoverSize;
  className?: string;
  onPick?: ((file: File) => void) | undefined;
  pending?: PendingImage | undefined;
  /** Шапка песни: по пустой - загрузка, загруженная открывается на весь экран */
  isInteractive?: boolean;
}
