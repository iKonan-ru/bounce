import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Строка свойства, как в панели Linear: подпись слева, значение справа.
export function PropRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-12 items-center gap-3 px-4 md:min-h-11', className)}>
      <span className="shrink-0 text-dim md:w-28">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  );
}
