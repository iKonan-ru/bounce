import type { Bucket } from './buckets';

/** Пропсы срока в строке плана */
export interface DueProps {
  /** Срок в формате PocketBase; пустая строка - без срока */
  due: string;
  /** Группа срока: от неё зависят слово вместо даты и цвет */
  bucket: Bucket;
}
