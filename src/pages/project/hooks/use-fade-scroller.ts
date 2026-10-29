import { useRef, useState, useCallback, useEffect } from 'react';
import { NO_SCROLL_EDGES, EDGE_TOLERANCE_PX } from '../constants/project';
import type { UseFadeScrollerResult, ScrollEdges } from '../types/project';

/** Края полосы с прокруткой вбок: какие из них уходят под градиент */
export function useFadeScroller(): UseFadeScrollerResult {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>(NO_SCROLL_EDGES);

  // useCallback: функция - зависимость эффекта с ResizeObserver; без стабильной ссылки
  // наблюдатель пересоздавался бы при каждой отрисовке
  const handleEdgesMeasure = useCallback((): void => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const hasMoreLeft = scroller.scrollLeft > EDGE_TOLERANCE_PX;
    const visibleEnd = scroller.scrollLeft + scroller.clientWidth;
    const hasMoreRight = visibleEnd < scroller.scrollWidth - EDGE_TOLERANCE_PX;
    setEdges((current: ScrollEdges): ScrollEdges => {
      const isSameLeft = current.hasMoreLeft === hasMoreLeft;
      const isSameRight = current.hasMoreRight === hasMoreRight;
      const isSame = isSameLeft && isSameRight;

      if (isSame) {
        return current;
      }

      return { hasMoreLeft, hasMoreRight };
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    handleEdgesMeasure();
    const resizeObserver = new ResizeObserver(handleEdgesMeasure);
    resizeObserver.observe(scroller);
    for (const child of Array.from(scroller.children)) {
      resizeObserver.observe(child);
    }

    return (): void => {
      resizeObserver.disconnect();
    };
  }, [handleEdgesMeasure]);

  return { scrollerRef, edges, handleEdgesMeasure };
}
