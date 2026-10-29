import type { QueryClient } from '@tanstack/react-query';
import { getKeyRoot, getRootKey, type QueryRoot } from './query-keys';

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

/** Корни ключей с оптимистичными правками (lib/query-keys.ts): песни (с этапами), задачи, публикации */
export type EditRoot = QueryRoot.Songs | QueryRoot.Tasks | QueryRoot.Posts;

/** Сколько правок в пути по корню ключа */
const editCounts = new Map<string, number>();

/** Правки в пути по корню ключа: накладываются заново на каждый ответ сервера */
const pendingApplies = new Map<string, Set<() => void>>();

/** Кэши запросов, за которыми уже следим */
const watchedClients = new WeakSet<QueryClient>();

/** Накладывать правки в пути на каждый ответ сервера */
function watchQueryCache(client: QueryClient): void {
  if (watchedClients.has(client)) {
    return;
  }

  watchedClients.add(client);
  client.getQueryCache().subscribe((event) => {
    // manual - это setQueryData, в том числе сами правки: на них не отвечаем
    const isServerResponse =
      event.type === 'updated' &&
      event.action.type === 'success' &&
      !event.action.manual;

    if (!isServerResponse) {
      return;
    }

    const applies =
      pendingApplies.get(getKeyRoot(event.query.queryKey)) ?? new Set();
    for (const apply of applies) {
      apply();
    }
  });
}

/** Есть ли правки в пути у данных с этим корнем */
export function checkIsEditInFlight(root: QueryRoot): boolean {
  return (editCounts.get(root) ?? 0) > 0;
}

/** Применить правку apply к кэшу сразу и отправить request на сервер */
export async function applyOptimisticEdit(
  client: QueryClient,
  root: EditRoot,
  apply: () => void,
  request: () => Promise<unknown>
): Promise<void> {
  watchQueryCache(client);
  await client.cancelQueries({ queryKey: getRootKey(root) });
  const snapshot = client.getQueriesData({ queryKey: getRootKey(root) });
  apply();
  editCounts.set(root, (editCounts.get(root) ?? 0) + 1);
  const applies = pendingApplies.get(root) ?? new Set();
  pendingApplies.set(root, applies);
  applies.add(apply);
  try {
    await request();
  } catch (error) {
    const isOnlyEdit = editCounts.get(root) === 1;

    if (isOnlyEdit) {
      for (const [key, data] of snapshot) {
        client.setQueryData(key, data);
      }
    }

    throw error;
  } finally {
    applies.delete(apply);
    const remaining = (editCounts.get(root) ?? 1) - 1;
    editCounts.set(root, remaining);

    if (remaining === 0) {
      await client.invalidateQueries({ queryKey: getRootKey(root) });
    }
  }
}
