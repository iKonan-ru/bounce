import type { ReactNode } from 'react';
import { useMotionList } from '../hooks/use-motion-list';
import type { MotionListProps } from '../types/motion-list';
import type { Identified } from '../types/sortable';
import { cn } from '../utils/cn';

/** Уходящие строки недоступны для нажатий и экранного диктора. */
export function MotionList<T extends Identified>({
  items,
  className,
  children,
}: MotionListProps<T>): ReactNode {
  const rows = useMotionList(items);
  const listClassName = cn(className, { hidden: rows.length === 0 });

  return (
    <ul className={listClassName}>
      {rows.map(({ item, isLeaving }) => (
        <li
          key={item.id}
          className="motion-list-row"
          data-leaving={isLeaving}
          inert={isLeaving}
          aria-hidden={isLeaving || undefined}
        >
          <div className="min-h-0 overflow-hidden">{children(item)}</div>
        </li>
      ))}
    </ul>
  );
}
