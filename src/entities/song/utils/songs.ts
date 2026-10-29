import { SONG_TITLE_FROM_NOTE_MAX, ELLIPSIS } from '../constants/songs';
import type { SongCovers } from '../types/songs';

/** Основная обложка песни: выбранная, иначе первая, иначе обложка для релиза */
export function getMainCover(song: SongCovers): string | undefined {
  const covers = song.covers ?? [];
  const galleryCover =
    covers.find((cover) => cover === song.main_cover) ?? covers[0];

  if (galleryCover) {
    return galleryCover;
  }

  return song.release_cover || undefined;
}

/** Название песни из заметки: первая строка, не длиннее 80 знаков */
export function getTitleFromNote(text: string): string {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';

  if (firstLine.length <= SONG_TITLE_FROM_NOTE_MAX) {
    return firstLine;
  }

  const shortened = firstLine.slice(0, SONG_TITLE_FROM_NOTE_MAX - 1).trimEnd();

  return `${shortened}${ELLIPSIS}`;
}
