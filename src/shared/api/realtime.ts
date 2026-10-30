import type { UnsubscribeFunc } from 'pocketbase';
import type { QueryClient } from '@tanstack/react-query';
import { NOTE_ACCESS_TOPIC } from '../constants/note-access';
import { REALTIME_ROOTS } from '../constants/query-keys';
import { QueryRoot } from '../types/query-keys';
import { refreshNoteAccess } from './note-access';
import { checkIsEditInFlight } from './optimistic';
import { pb } from './pb';
import { getRootKey } from './query-keys';

/**
 * Изменения от других участников приходят по realtime PocketBase: запись коллекции перечитывает
 * её запросы (таблица REALTIME_ROOTS, shared/api/query-keys.ts)
 *
 * Возвращает отписку
 */
export function subscribeRealtime(client: QueryClient): () => void {
  // пока свои правки этой коллекции в пути, событие не перечитывает её: перечитает сама
  // последняя правка (shared/api/optimistic.ts)
  const createRefresh =
    (root: QueryRoot): (() => void) =>
    () => {
      if (root === QueryRoot.Notes) {
        void refreshNoteAccess(client);
      }

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

  const refresh = (): void => {
    void refreshNoteAccess(client);
  };
  subscriptions.push(
    pb.realtime
      .subscribe(NOTE_ACCESS_TOPIC, () => {
        void refreshNoteAccess(client, true);
      })
      .catch((error: unknown) => {
        console.error(error);

        return undefined;
      })
  );
  subscriptions.push(
    pb.realtime.subscribe('PB_CONNECT', refresh).catch((error: unknown) => {
      console.error(error);

      return undefined;
    })
  );
  window.addEventListener('online', refresh);
  window.addEventListener('focus', refresh);
  refresh();

  return () => {
    window.removeEventListener('online', refresh);
    window.removeEventListener('focus', refresh);
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
