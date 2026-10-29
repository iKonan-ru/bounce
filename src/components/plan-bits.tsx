import { dateLabel } from '@/lib/format';
import type { Bucket } from '@/lib/plan';
import { cn } from '@/lib/utils';

// срок справа в строке: "сегодня, 14:30", "5 нояб."; просроченный - красным
export function Due({ due, bucket }: { due: string; bucket: Bucket }) {
  if (!due) return null;
  const day = bucket === 'today' ? 'сегодня' : bucket === 'tomorrow' ? 'завтра' : dateLabel(due);
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        bucket === 'overdue' ? 'text-led-red' : 'text-dim',
      )}
    >
      {day}
    </span>
  );
}
