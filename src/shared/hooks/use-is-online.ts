import { useSyncExternalStore } from 'react';
import { subscribe } from '../api/offline';

/** Есть ли сеть по мнению браузера */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
}
