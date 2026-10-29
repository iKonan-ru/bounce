import { useSyncExternalStore } from 'react';
import { subscribe, getMeSnapshot } from '../api/session';
import type { Me } from '../types/session';

/** Текущий пользователь; без сессии - null */
export function useMe(): Me | null {
  return useSyncExternalStore(subscribe, getMeSnapshot, () => null);
}
