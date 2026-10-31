import type { PropsWithChildren, ReactNode } from 'react';
import { useSegmentedIndicator } from '../hooks/use-segmented-indicator';

/** Общая подложка фильтров; прокрутка остаётся во внешнем контейнере. */
export function FilterBar({ children }: PropsWithChildren): ReactNode {
  const ref = useSegmentedIndicator<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="filter-motion segmented-motion relative isolate flex w-max min-w-full gap-1"
    >
      <span aria-hidden="true" className="segmented-indicator" />
      {children}
    </div>
  );
}
