import type { QueryClient } from '@tanstack/react-query';
import type { SongStage } from './model';
import { collection, pb } from './pb';
import type { SongWithStages } from './queries';

export type StagePatch = Partial<
  Pick<SongStage, 'status' | 'note' | 'substeps' | 'deadline' | 'title' | 'optional'>
>;

// Правка этапа: сразу в кэше песни (интерфейс не ждёт сеть), потом в PocketBase; при ошибке
// песня перечитывается с сервера.
export async function updateStage(
  client: QueryClient,
  songId: string,
  stageId: string,
  patch: StagePatch,
): Promise<void> {
  client.setQueryData<SongWithStages>(['songs', songId], (song) =>
    song
      ? {
          ...song,
          expand: {
            ...song.expand,
            song_stages_via_song: (song.expand?.song_stages_via_song ?? []).map((s) =>
              s.id === stageId ? { ...s, ...patch } : s,
            ),
          },
        }
      : song,
  );
  try {
    await collection(pb, 'song_stages').update(stageId, patch);
  } finally {
    await client.invalidateQueries({ queryKey: ['songs'] });
  }
}
