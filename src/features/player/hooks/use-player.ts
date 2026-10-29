import { useSyncExternalStore } from 'react';
import { listeners, state } from '../store/player';
import type { PlayerState } from '../types/player';

/** Состояние плеера */
export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}
