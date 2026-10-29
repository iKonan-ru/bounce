import type { ReactNode } from 'react';
import type { PropRowProps } from '../types/prop-row';
import { cn } from '../utils/cn';

/** Строка свойства, как в панели Linear: подпись слева, значение справа */
export function PropRow({
  label,
  children,
  className,
}: PropRowProps): ReactNode {
  const rowClassName = cn(
    'flex min-h-12 items-center gap-3 px-4 md:min-h-11',
    className
  );

  return (
    <div className={rowClassName}>
      <span className="shrink-0 text-dim md:w-28">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end">
        {children}
      </div>
    </div>
  );
}
