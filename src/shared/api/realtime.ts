import type { UnsubscribeFunc } from 'pocketbase';
import type { QueryClient } from '@tanstack/react-query';
import { REALTIME_ROOTS } from '../constants/query-keys';
import type { QueryRoot } from '../types/query-keys';
import { checkIsEditInFlight } from './optimistic';
import { pb } from './pb';
import { getRootKey } from './query-keys';

/**
 * Изменения от других участников приходят по realtime PocketBase: запись коллекции перечитывает
 * её запросы (таблица REALTIME_ROOTS, lib/query-keys.ts)
 *
 * Возвращает отписку
 */
export function subscribeRealtime(client: QueryClient): () => void {
  // пока свои правки этой коллекции в пути, событие не перечитывает её: перечитает сама
  // последняя правка (lib/optimistic.ts)
  const createRefresh =
    (root: QueryRoot): (() => void) =>
    () => {
      if (!checkIsEditInFlight(root)) {
        void client.invalidateQueries({ queryKey: getRootKey(root) });
      }
    };
  const subscribeCollection = (
    name: string,
    root: QueryRoot
  ): Promise<UnsubscribeFunc | undefined> =>
    // без сети подписка не встанет; SDK переподключится сам, когда связь вернётся
    pb
      .collection(name)
      .subscribe('*', createRefresh(root))
      .catch((error: unknown) => {
        console.error(error);

        return undefined;
      });
  const subscriptions = Object.entries(REALTIME_ROOTS).map(([name, root]) =>
    subscribeCollection(name, root)
  );

  return () => {
    for (const subscription of subscriptions) {
      void subscription
        .then((unsubscribe) => {
          if (unsubscribe) {
            return unsubscribe();
          }

          return undefined;
        })
        .catch(console.error);
    }
  };
}
