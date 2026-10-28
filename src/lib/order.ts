import type PocketBase from 'pocketbase';

type Positioned = { id: string; position: number };

// Новый порядок после сдвига элемента на шаг вверх (-1) или вниз (+1).
export function moved<T extends Positioned>(
  items: ReadonlyArray<T>,
  id: string,
  step: -1 | 1,
): T[] {
  const list = [...items].sort((a, b) => a.position - b.position);
  const i = list.findIndex((x) => x.id === id);
  const j = i + step;
  const a = list[i];
  const b = list[j];
  if (i < 0 || !a || !b) return list;
  list[i] = b;
  list[j] = a;
  return list;
}

// Позиции по порядку списка (0, 1, 2...) одной транзакцией; меняются только сдвинутые записи.
export async function savePositions(
  client: PocketBase,
  collection: 'song_stages' | 'stage_templates',
  ordered: ReadonlyArray<Positioned>,
): Promise<void> {
  const changed = ordered.map((x, i) => ({ x, i })).filter(({ x, i }) => x.position !== i);
  if (changed.length === 0) return;
  const batch = client.createBatch();
  for (const { x, i } of changed) batch.collection(collection).update(x.id, { position: i });
  await batch.send();
}

// позиция для нового элемента в конце списка
export function nextPosition(items: ReadonlyArray<Positioned>): number {
  return items.reduce((max, x) => Math.max(max, x.position + 1), 0);
}
