import { Bucket } from '../types/buckets';

/** Группы сроков по порядку */
export const BUCKETS: readonly Bucket[] = Object.values(Bucket);

/** Подписи групп сроков */
export const BUCKET_LABEL: Record<Bucket, string> = {
  [Bucket.Overdue]: 'Просрочено',
  [Bucket.Today]: 'Сегодня',
  [Bucket.Tomorrow]: 'Завтра',
  [Bucket.Week]: 'На неделе',
  [Bucket.Later]: 'Позже',
  [Bucket.None]: 'Без срока',
};

/** Последний день группы "на неделе": через 6 дней от сегодня */
export const WEEK_LAST_DAY_OFFSET = 6;
