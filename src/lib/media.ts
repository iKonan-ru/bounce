import { useSyncExternalStore } from 'react';

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Широкий экран (от 1024px): страницы раскладываются в две колонки.
export function useWide(): boolean {
  return useMedia('(min-width: 1024px)');
}

// Просторный экран (от 1280px): боковая панель стоит рядом с содержимым и в развёрнутом виде;
// уже - только узкой полосой значков, а разворачивается поверх страницы.
export function useRoomy(): boolean {
  return useMedia('(min-width: 1280px)');
}
