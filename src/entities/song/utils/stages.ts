import { comparePositions } from '@/shared/utils';
import type { SongWithStages, SongStage } from '../types/song';

/** Этапы песни из expand (обратная связь song_stages.song) - по порядку */
export function getOrderedStages(song: SongWithStages): SongStage[] {
  const stages = song.expand?.song_stages_via_song ?? [];

  return [...stages].sort(comparePositions);
}
