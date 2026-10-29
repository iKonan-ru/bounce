import type { ReactNode } from 'react';
import type { SectionProps } from '../types/page';

/** Секция: тихая подпись сверху (как в "Настройках" iOS и панели свойств Linear) и содержимое */
export function Section({
  title,
  action,
  children,
  className,
}: SectionProps): ReactNode {
  const hasHeading = Boolean(title) || Boolean(action);

  return (
    <section className={className}>
      {hasHeading && (
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3 px-1">
          {title && <h2 className="text-sm font-medium text-dim">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
