import type { ReactNode } from 'react';
import { DAY_WORD } from '../constants/due';
import { Bucket } from '../types/buckets';
import type { DueProps } from '../types/due';
import { cn } from '../utils/cn';
import { getDateLabel } from '../utils/format';

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
