import { Bucket } from '../types/buckets';

/** Слово вместо даты для ближайших сроков */
export const DAY_WORD: Partial<Record<Bucket, string>> = {
  [Bucket.Today]: 'сегодня',
  [Bucket.Tomorrow]: 'завтра',
};
