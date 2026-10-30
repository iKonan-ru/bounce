import { SongStatus } from '../types/song';
import type { Song } from '../types/song';

/** Представление без релизных сведений: исходная запись в кэше и на сервере не меняется */
export function getSongForDisplay<SongRecord extends Song>(
  song: SongRecord,
  isReleaseEnabled: boolean
): SongRecord {
  if (isReleaseEnabled) {
    return song;
  }

  const hasReleaseStatus =
    song.status === SongStatus.sent || song.status === SongStatus.released;
  const status = hasReleaseStatus ? SongStatus.done : song.status;

  return { ...song, status, target_release: '', bandlink: '' };
}
