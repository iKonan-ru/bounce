import type { QueryClient } from '@tanstack/react-query';
import type PocketBase from 'pocketbase';
import type { SongStage } from './model';
import { collection, pb } from './pb';
import type { SongWithStages } from './queries';

export type StagePatch = Partial<Pick<SongStage, 'status' | 'substeps' | 'deadline' | 'title'>>;

function patchSong(
  client: QueryClient,
  songId: string,
  map: (stages: SongStage[]) => SongStage[],
): void {
  client.setQueryData<SongWithStages>(['songs', songId], (song) =>
    song
      ? {
          ...song,
          expand: {
            ...song.expand,
            song_stages_via_song: map(song.expand?.song_stages_via_song ?? []),
          },
        }
      : song,
  );
}

// Правка этапа: сразу в кэше песни (интерфейс не ждёт сеть), потом в PocketBase; после ответа
// песня перечитывается с сервера.
export async function updateStage(
  client: QueryClient,
  songId: string,
  stageId: string,
  patch: StagePatch,
): Promise<void> {
  patchSong(client, songId, (list) => list.map((s) => (s.id === stageId ? { ...s, ...patch } : s)));
  try {
    await collection(pb, 'song_stages').update(stageId, patch);
  } finally {
    await client.invalidateQueries({ queryKey: ['songs'] });
  }
}

// Новый порядок этапов после перетаскивания: сразу в кэше, потом позиции одной транзакцией.
export async function reorderStages(
  client: QueryClient,
  songId: string,
  ordered: ReadonlyArray<SongStage>,
): Promise<void> {
  patchSong(client, songId, () => ordered.map((s, i) => ({ ...s, position: i })));
  try {
    await savePositions(pb, 'song_stages', ordered);
  } finally {
    await client.invalidateQueries({ queryKey: ['songs'] });
  }
}

type Positioned = { id: string; position: number };

// Позиции по порядку списка (0, 1, 2...) одной транзакцией; меняются только сдвинутые записи.
export async function savePositions(
  client: PocketBase,
  name: 'song_stages' | 'stage_templates' | 'songs',
  ordered: ReadonlyArray<Positioned>,
): Promise<void> {
  const changed = ordered.map((x, i) => ({ x, i })).filter(({ x, i }) => x.position !== i);
  if (changed.length === 0) return;
  const batch = client.createBatch();
  for (const { x, i } of changed) batch.collection(name).update(x.id, { position: i });
  await batch.send();
}

// позиция для нового элемента в конце списка
export function nextPosition(items: ReadonlyArray<Positioned>): number {
  return items.reduce((max, x) => Math.max(max, x.position + 1), 0);
}

// элемент с id from встаёт на место элемента с id to
export function arrayMoveById<T extends { id: string }>(
  items: ReadonlyArray<T>,
  from: string,
  to: string,
): T[] {
  const list = [...items];
  const i = list.findIndex((x) => x.id === from);
  const j = list.findIndex((x) => x.id === to);
  if (i < 0 || j < 0 || i === j) return list;
  const [item] = list.splice(i, 1);
  if (item) list.splice(j, 0, item);
  return list;
}
