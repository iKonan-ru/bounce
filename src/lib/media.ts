import { useSyncExternalStore } from 'react';

/** Широкий экран: страницы раскладываются в две колонки */
const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

/** Просторный экран: боковая панель стоит рядом с содержимым */
const ROOMY_SCREEN_QUERY = '(min-width: 1280px)';

/** Совпадает ли экран с медиазапросом; без окна (сборка) - нет */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Широкий экран (от 1024px): страницы раскладываются в две колонки */
export function useIsWideScreen(): boolean {
  return useMediaQuery(WIDE_SCREEN_QUERY);
}

/**
 * Просторный экран (от 1280px): боковая панель стоит рядом с содержимым и в развёрнутом виде
 *
 * Уже - только узкой полосой значков, а разворачивается поверх страницы
 */
export function useIsRoomyScreen(): boolean {
  return useMediaQuery(ROOMY_SCREEN_QUERY);
}
