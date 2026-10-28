import { type QueryClient, queryOptions } from '@tanstack/react-query';
import type { SongStage, StageTemplate } from './model';
import { collection, pb } from './pb';
import type { SongsResponse } from './pb-types';

export type SongWithStages = SongsResponse<{ song_stages_via_song?: SongStage[] }>;

// этапы песни из expand (обратная связь song_stages.song) - по порядку
export function stagesOf(song: SongWithStages): SongStage[] {
  return [...(song.expand?.song_stages_via_song ?? [])].sort((a, b) => a.position - b.position);
}

const SONG_EXPAND = 'song_stages_via_song';

export const songsQuery = queryOptions({
  queryKey: ['songs'],
  queryFn: () =>
    collection(pb, 'songs').getFullList<SongWithStages>({ sort: '-updated', expand: SONG_EXPAND }),
});

export function songQuery(id: string) {
  return queryOptions({
    queryKey: ['songs', id],
    queryFn: () => collection(pb, 'songs').getOne<SongWithStages>(id, { expand: SONG_EXPAND }),
  });
}

export const templatesQuery = queryOptions({
  queryKey: ['stage_templates'],
  queryFn: () => collection(pb, 'stage_templates').getFullList<StageTemplate>({ sort: 'position' }),
  staleTime: 5 * 60_000,
});

// Изменения от второго участника приходят по realtime PocketBase: любая запись песни или этапа
// перечитывает песни. Возвращает отписку.
export function subscribeRealtime(client: QueryClient): () => void {
  const refresh = () => void client.invalidateQueries({ queryKey: ['songs'] });
  const subs = [
    pb.collection('songs').subscribe('*', refresh),
    pb.collection('song_stages').subscribe('*', refresh),
    pb
      .collection('stage_templates')
      .subscribe('*', () => void client.invalidateQueries({ queryKey: ['stage_templates'] })),
  ];
  return () => {
    for (const s of subs) void s.then((unsubscribe) => unsubscribe()).catch(() => undefined);
  };
}
