import type PocketBase from 'pocketbase';
import type { OrderedCollection, Positioned } from '../types/order';

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
