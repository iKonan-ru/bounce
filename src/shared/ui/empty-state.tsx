import type { ReactNode } from 'react';
import { GROUP } from '../constants/page';
import type { EmptyStateProps } from '../types/page';
import { cn } from '../utils/cn';

/** Пустой список: пояснение и, если есть, первое действие */
export function EmptyState({ children, action }: EmptyStateProps): ReactNode {
  const emptyClassName = cn(
    GROUP,
    'flex flex-col items-center gap-3 px-6 py-10 text-center'
  );

  return (
    <div className={emptyClassName}>
      <p className="text-dim">{children}</p>
      {action}
    </div>
  );
}
