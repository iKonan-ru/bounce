import { useQuery } from '@tanstack/react-query';
import { dateLabel } from '@/lib/format';
import { projectPeople, type User } from '@/lib/model';
import type { Bucket } from '@/lib/plan';
import { projectQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

// люди проекта по id - для аватаров в строках плана
export function usePeople(projectId: string): Map<string, User> {
  const project = useQuery(projectQuery(projectId));
  return new Map(
    project.data ? projectPeople(project.data).map((p) => [p.user.id, p.user] as const) : [],
  );
}

// срок справа в строке: "сегодня, 14:30", "5 нояб."; просроченный - красным
export function Due({ due, time, bucket }: { due: string; time: string; bucket: Bucket }) {
  if (!due) return null;
  const day = bucket === 'today' ? 'сегодня' : bucket === 'tomorrow' ? 'завтра' : dateLabel(due);
  const label = time ? `${day}, ${time}` : day;
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        bucket === 'overdue' ? 'text-led-red' : 'text-dim',
      )}
    >
      {label}
    </span>
  );
}
