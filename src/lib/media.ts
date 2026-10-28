import { useSyncExternalStore } from 'react';

// Широкий экран (от 1024px): страницы раскладываются в две колонки.
const WIDE = '(min-width: 1024px)';

function subscribe(onChange: () => void): () => void {
  const m = window.matchMedia(WIDE);
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}

export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
