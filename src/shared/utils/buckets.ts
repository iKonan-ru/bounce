import { WEEK_LAST_DAY_OFFSET } from '../constants/buckets';
import type { Assignable, Dated } from '../types/buckets';
import { Bucket } from '../types/buckets';
import { getIsoDayKey, getDayKey } from './format';

/** Дата через days дней */
function addDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);

  return shifted;
}

/** Группа срока; сроки хранятся полднем UTC, поэтому первые 10 знаков - это календарный день срока */
export function getBucket(due: string, today: Date): Bucket {
  if (!due) {
    return Bucket.None;
  }

  const day = getIsoDayKey(due);
  const todayKey = getDayKey(today);

  if (day < todayKey) {
    return Bucket.Overdue;
  }

  if (day === todayKey) {
    return Bucket.Today;
  }

  if (day === getDayKey(addDays(today, 1))) {
    return Bucket.Tomorrow;
  }

  if (day <= getDayKey(addDays(today, WEEK_LAST_DAY_OFFSET))) {
    return Bucket.Week;
  }

  return Bucket.Later;
}

/** Исполнитель среди назначенных; без исполнителя - подходит любая запись */
export function checkIsAssignedTo(
  item: Assignable,
  assigneeId?: string
): boolean {
  if (!assigneeId) {
    return true;
  }

  return (item.assignees ?? []).includes(assigneeId);
}

/** Пункты по дню срока; в один день - как пришли (сортировка устойчивая) */
export function sortByDueDay<Item extends Dated>(
  items: readonly Item[]
): Item[] {
  return [...items].sort((first, second) =>
    getIsoDayKey(first.due).localeCompare(getIsoDayKey(second.due))
  );
}
