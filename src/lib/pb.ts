import PocketBase, { type RecordService } from 'pocketbase';
import type { CollectionResponses } from './pb-types';

// PocketBase отдаёт и приложение, и API с одного адреса (в dev - через прокси Vite)
export const pb = new PocketBase(
  typeof window === 'undefined' ? undefined : window.location.origin,
);

// Коллекция с типами записей из pb-types.ts (pnpm typegen).
export function collection<T extends keyof CollectionResponses>(
  client: PocketBase,
  name: T,
): RecordService<CollectionResponses[T]> {
  return client.collection<CollectionResponses[T]>(name);
}
