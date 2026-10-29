import PocketBase, { type RecordService } from 'pocketbase';
import type { CollectionResponses } from './pb-types';

export { Collections } from './pb-types';

/** Клиент PocketBase: сервер отдаёт и приложение, и API с одного адреса (в dev - через прокси Vite) */
export const pb = new PocketBase(
  typeof window === 'undefined' ? undefined : window.location.origin,
);

// Автоотмена SDK выключена: она обрывает предыдущий запрос с тем же методом и путём (без учёта
// параметров), и две отправки заметки или две быстрые правки одного этапа отменяли друг друга.
// Дубли и устаревшие ответы чтения и так разводит TanStack Query.
pb.autoCancellation(false);

/** Коллекция с типами записей из pb-types.ts (pnpm typegen) */
export function getCollection<Name extends keyof CollectionResponses>(
  client: PocketBase,
  name: Name,
): RecordService<CollectionResponses[Name]> {
  return client.collection<CollectionResponses[Name]>(name);
}
