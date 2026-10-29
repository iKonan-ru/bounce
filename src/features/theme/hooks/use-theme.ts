import { useSyncExternalStore } from 'react';
import { listeners, currentTheme } from '../store/theme';
import { ThemeChoice } from '../types/theme';

/** Выбранная тема */
export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => currentTheme,
    () => ThemeChoice.System
  );
}
