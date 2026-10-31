import { useEffect, useState } from 'react';
import type { MotionRow } from '../types/motion-list';
import type { Identified } from '../types/sortable';
import { useMediaQuery } from './use-media-query';

/** Удалённые строки ненадолго остаются в потоке, чтобы соседние плавно заняли их место. */
export function useMotionList<T extends Identified>(
  items: T[]
): MotionRow<T>[] {
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [state, setState] = useState({
    source: items,
    rows: items.map((item) => ({ item, isLeaving: false })),
  });

  if (state.source !== items) {
    const ids = new Set(items.map((item) => item.id));
    const rows = items.map((item) => ({ item, isLeaving: false }));

    if (!isReducedMotion) {
      state.rows.forEach((row, index) => {
        if (!ids.has(row.item.id)) {
          rows.splice(index, 0, { item: row.item, isLeaving: true });
        }
      });
    }

    setState({ source: items, rows });
  }

  useEffect(() => {
    if (!state.rows.some((row) => row.isLeaving)) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setState((current) => ({
          ...current,
          rows: current.rows.filter((row) => !row.isLeaving),
        }));
      },
      isReducedMotion ? 0 : 200
    );

    return () => window.clearTimeout(timeout);
  }, [state.rows, isReducedMotion]);

  return state.rows;
}
