import type { ReactNode } from 'react';
import { FilterBar } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { FADE_CLASS_NAME } from '../constants/project';
import { useFadeScroller } from '../hooks/use-fade-scroller';
import type { FadeScrollerProps } from '../types/project';

/**
 * Полоса, которая прокручивается вбок
 *
 * Край, за которым есть ещё, уходит под градиент цвета страницы
 */
export function FadeScroller({
  className,
  children,
}: FadeScrollerProps): ReactNode {
  const { scrollerRef, edges, handleEdgesMeasure } = useFadeScroller();
  const wrapperClassName = cn(
    'relative -ml-4 min-w-0 flex-1 md:ml-0',
    className
  );
  const leftFadeClassName = cn(FADE_CLASS_NAME, 'left-0 bg-linear-to-r', {
    'opacity-0': !edges.hasMoreLeft,
  });
  const rightFadeClassName = cn(FADE_CLASS_NAME, 'right-0 bg-linear-to-l', {
    'opacity-0': !edges.hasMoreRight,
  });

  return (
    <div className={wrapperClassName}>
      <div
        ref={scrollerRef}
        onScroll={handleEdgesMeasure}
        className="flex gap-1 overflow-x-auto pl-4 md:pl-0 [scrollbar-width:none]"
      >
        <FilterBar>{children}</FilterBar>
      </div>
      <div aria-hidden="true" className={leftFadeClassName} />
      <div aria-hidden="true" className={rightFadeClassName} />
    </div>
  );
}
