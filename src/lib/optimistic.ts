import type { QueryClient } from '@tanstack/react-query';
import { type QueryRoot, rootKey, rootOf } from './query-keys';

// Оптимистичная правка: интерфейс меняется сразу, запрос уходит следом.
//
// - Перед правкой отменяются идущие перечитывания этих данных: иначе ответ, отправленный сервером
//   до правки, пришёл бы после неё и затёр её.
// - Пока правки в пути, realtime не перечитывает данные (subscribeRealtime), а если их всё же
//   перечитали (возврат в приложение, новый экран, другая мутация), правки в пути накладываются
//   на ответ заново: иначе ответ без первой правки откатил бы её в интерфейсе, а следующая
//   правка массива (подэтапы, исполнители) ушла бы на сервер уже без неё. Поэтому apply должна
//   давать тот же результат при повторе (ставить значения, а не добавлять).
// - Когда закончилась последняя правка, данные перечитываются один раз.
// - Отказ сервера возвращает данные, какими они были до правки, - если других правок в пути нет;
//   иначе их поправит то самое перечитывание после последней.

// root - первая часть ключа запросов (lib/query-keys.ts): 'songs' (песни и их этапы), 'tasks', 'posts'
export type EditRoot = Extract<QueryRoot, 'songs' | 'tasks' | 'posts'>;

const inFlight = new Map<string, number>();
// правки в пути по корню ключа: накладываются заново на каждый ответ сервера
const pending = new Map<string, Set<() => void>>();
const watched = new WeakSet<QueryClient>();

function watch(client: QueryClient) {
  if (watched.has(client)) return;
  watched.add(client);
  client.getQueryCache().subscribe((event) => {
    // manual - это setQueryData, в том числе сами правки: на них не отвечаем
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const applies = pending.get(rootOf(event.query.queryKey));
    if (applies) for (const apply of applies) apply();
  });
}

export function editsInFlight(root: QueryRoot): boolean {
  return (inFlight.get(root) ?? 0) > 0;
}

export async function optimisticEdit(
  client: QueryClient,
  root: EditRoot,
  apply: () => void,
  request: () => Promise<unknown>,
): Promise<void> {
  watch(client);
  await client.cancelQueries({ queryKey: rootKey(root) });
  const before = client.getQueriesData({ queryKey: rootKey(root) });
  apply();
  inFlight.set(root, (inFlight.get(root) ?? 0) + 1);
  const applies = pending.get(root) ?? new Set();
  pending.set(root, applies);
  applies.add(apply);
  try {
    await request();
  } catch (e) {
    if (inFlight.get(root) === 1) {
      for (const [key, data] of before) client.setQueryData(key, data);
    }
    throw e;
  } finally {
    applies.delete(apply);
    const left = (inFlight.get(root) ?? 1) - 1;
    inFlight.set(root, left);
    if (left === 0) await client.invalidateQueries({ queryKey: rootKey(root) });
  }
}
