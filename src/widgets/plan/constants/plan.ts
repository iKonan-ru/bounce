import { SongStatus } from '@/entities/song';

/** Статусы песни, этапы которой попадают в план: в работе или ещё не начата */
export const PLAN_SONG_STATUSES: ReadonlySet<SongStatus> = new Set([
  SongStatus.active,
  SongStatus.not_started,
]);
