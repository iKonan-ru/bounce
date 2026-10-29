import {
  queryKeys,
  applyOptimisticEdit,
  getCollection,
  pb,
  Collections,
  savePositions,
} from '@/shared/api';
import { QueryRoot } from '@/shared/types';
import { comparePositions } from '@/shared/utils';
import type { QueryClient } from '@tanstack/react-query';
import type { SongStage, SongWithStages } from '../types/song';
import type { StagePatch } from '../types/stages';

/** Правка этапов песни в кэше: в запросе самой песни и в списке песен проекта */
function patchCachedSongStages(
  client: QueryClient,
  songId: string,
  patchStages: (stages: SongStage[]) => SongStage[]
): void {
  const patchCachedSong = (song: SongWithStages): SongWithStages => ({
    ...song,
    expand: {
      ...song.expand,
      song_stages_via_song: patchStages(
        song.expand?.song_stages_via_song ?? []
      ),
    },
  });
  const patchListedSong = (song: SongWithStages): SongWithStages => {
    if (song.id !== songId) {
      return song;
    }

    return patchCachedSong(song);
  };
  client.setQueryData<SongWithStages>(queryKeys.songs.one(songId), (song) => {
    if (!song) {
      return song;
    }

    return patchCachedSong(song);
  });
  // и в списке песен проекта: его показывают план и страница проекта
  client.setQueriesData<SongWithStages[]>(
    { queryKey: queryKeys.songs.lists },
    (list) => list?.map(patchListedSong)
  );
}

/**
 * Правка этапа: сразу в кэше песни (интерфейс не ждёт сеть), потом в PocketBase
 *
 * Откат при отказе и перечитывание после последней правки - в shared/api/optimistic.ts
 */
export async function updateStage(
  client: QueryClient,
  songId: string,
  stageId: string,
  patch: StagePatch
): Promise<void> {
  const patchStage = (stage: SongStage): SongStage => {
    if (stage.id !== stageId) {
      return stage;
    }

    return { ...stage, ...patch };
  };
  await applyOptimisticEdit(
    client,
    QueryRoot.Songs,
    () =>
      patchCachedSongStages(client, songId, (stages) => stages.map(patchStage)),
    () => getCollection(pb, Collections.SongStages).update(stageId, patch)
  );
}

/** Новый порядок этапов после перетаскивания: сразу в кэше, потом позиции одной транзакцией */
export async function reorderStages(
  client: QueryClient,
  songId: string,
  ordered: readonly SongStage[]
): Promise<void> {
  const positionById = new Map(
    ordered.map((stage, index): [string, number] => [stage.id, index])
  );
  // только позиции: применяется и поверх свежих данных с сервера (shared/api/optimistic.ts)
  const reorder = (stages: SongStage[]): SongStage[] =>
    stages
      .map((stage) => ({
        ...stage,
        position: positionById.get(stage.id) ?? stage.position,
      }))
      .sort(comparePositions);
  await applyOptimisticEdit(
    client,
    QueryRoot.Songs,
    () => patchCachedSongStages(client, songId, reorder),
    () => savePositions(pb, 'song_stages', ordered)
  );
}
