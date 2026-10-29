import type PocketBase from 'pocketbase';
import type { QueryClient } from '@tanstack/react-query';
import {
  comparePositions,
  type Positioned,
  type SongStage,
  type SongWithStages,
} from './model';
import { applyOptimisticEdit } from './optimistic';
import { Collections, getCollection, pb } from './pb';
import { QueryRoot, queryKeys } from './query-keys';

/** Правка этапа песни */
export type StagePatch = Partial<
  Pick<SongStage, 'status' | 'substeps' | 'deadline' | 'title' | 'assignees'>
>;

/** Коллекции с ручным порядком записей */
type OrderedCollection =
  | typeof Collections.SongStages
  | typeof Collections.StageTemplates
  | typeof Collections.Songs;

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
 * Откат при отказе и перечитывание после последней правки - в lib/optimistic.ts
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
  // только позиции: применяется и поверх свежих данных с сервера (lib/optimistic.ts)
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

/** Позиции по порядку списка (0, 1, 2...) одной транзакцией; меняются только сдвинутые записи */
export async function savePositions(
  client: PocketBase,
  name: OrderedCollection,
  ordered: readonly Positioned[]
): Promise<void> {
  const moved = [...ordered.entries()].filter(
    ([index, item]) => item.position !== index
  );

  if (moved.length === 0) {
    return;
  }

  const batch = client.createBatch();
  for (const [index, item] of moved) {
    batch.collection(name).update(item.id, { position: index });
  }
  await batch.send();
}

/** Позиция для нового элемента в конце списка */
export function getNextPosition(items: readonly Positioned[]): number {
  return items.reduce(
    (maxPosition, item) => Math.max(maxPosition, item.position + 1),
    0
  );
}

/** Элемент с id from встаёт на место элемента с id to */
export function moveItemById<Item extends { id: string }>(
  items: readonly Item[],
  from: string,
  to: string
): Item[] {
  const list = [...items];
  const fromIndex = list.findIndex((item) => item.id === from);
  const toIndex = list.findIndex((item) => item.id === to);
  const isMissing = fromIndex < 0 || toIndex < 0;

  if (isMissing || fromIndex === toIndex) {
    return list;
  }

  const [moved] = list.splice(fromIndex, 1);

  if (moved) {
    list.splice(toIndex, 0, moved);
  }

  return list;
}
