import type { ReactNode } from 'react';
import { getDateLabel } from '@/lib/format';
import { Bucket } from '@/lib/plan';
import { cn } from '@/lib/utils';

/** Слово вместо даты для ближайших сроков */
const DAY_WORD: Partial<Record<Bucket, string>> = {
  [Bucket.Today]: 'сегодня',
  [Bucket.Tomorrow]: 'завтра',
};

/** Пропсы срока в строке плана */
interface DueProps {
  /** Срок в формате PocketBase; пустая строка - без срока */
  due: string;
  /** Группа срока: от неё зависят слово вместо даты и цвет */
  bucket: Bucket;
}

/** Срок справа в строке: "сегодня", "завтра", "5 нояб."; просроченный - красным */
export function Due({ due, bucket }: DueProps): ReactNode {
  if (!due) {
    return null;
  }

  const day = DAY_WORD[bucket] ?? getDateLabel(due);
  const isOverdue = bucket === Bucket.Overdue;
  const dueClassName = cn('shrink-0 text-xs tabular-nums', {
    'text-led-red': isOverdue,
    'text-dim': !isOverdue,
  });

  return <span className={dueClassName}>{day}</span>;
}
