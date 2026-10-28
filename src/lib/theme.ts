import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'bounce.theme';
const listeners = new Set<() => void>();
const media =
  typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let current: ThemeChoice = typeof window === 'undefined' ? 'system' : read();

function apply(): void {
  const dark = current === 'dark' || (current === 'system' && media?.matches === true);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#161a22' : '#eef0f3');
}

export function initTheme(): void {
  apply();
  media?.addEventListener('change', () => {
    if (current === 'system') apply();
  });
}

export function setTheme(choice: ThemeChoice): void {
  current = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // без хранилища тема держится до перезагрузки
  }
  apply();
  for (const l of listeners) l();
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => 'system',
  );
}
