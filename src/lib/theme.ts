import { useSyncExternalStore } from 'react';

/** Выбранная тема */
export enum ThemeChoice {
  /** Как в системе */
  System = 'system',
  /** Светлая */
  Light = 'light',
  /** Тёмная */
  Dark = 'dark',
}

/** Ключ темы в localStorage (его же читает index.html до загрузки приложения) */
const THEME_KEY = 'bounce.theme';

/** Темы, которые сохраняются явно; без сохранённой - как в системе */
const STORED_THEMES: readonly ThemeChoice[] = [
  ThemeChoice.Light,
  ThemeChoice.Dark,
];

/** Цвет рамки окна в тёмной теме */
const DARK_THEME_COLOR = '#161a22';

/** Цвет рамки окна в светлой теме */
const LIGHT_THEME_COLOR = '#eef0f3';

/** Подписчики смены темы */
const listeners = new Set<() => void>();

/** Тёмная тема в системе; без окна (сборка) - нет */
const darkSchemeQuery =
  typeof window === 'undefined'
    ? null
    : window.matchMedia('(prefers-color-scheme: dark)');

/** Сохранённая тема; нет или хранилище недоступно - как в системе */
function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);

    return (
      STORED_THEMES.find((theme) => theme === stored) ?? ThemeChoice.System
    );
  } catch {
    return ThemeChoice.System;
  }
}

/** Текущая тема */
let currentTheme: ThemeChoice =
  typeof window === 'undefined' ? ThemeChoice.System : readTheme();

/** Применить тему к странице: класс dark и цвет рамки окна */
function applyTheme(): void {
  const isSystemDark =
    currentTheme === ThemeChoice.System && darkSchemeQuery?.matches === true;
  const isDark = currentTheme === ThemeChoice.Dark || isSystemDark;
  document.documentElement.classList.toggle('dark', isDark);
  const themeColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', themeColor);
}

/** Применить тему при запуске и следить за темой системы */
export function initTheme(): void {
  applyTheme();
  darkSchemeQuery?.addEventListener('change', () => {
    if (currentTheme === ThemeChoice.System) {
      applyTheme();
    }
  });
}

/** Выбрать тему и запомнить её на устройстве */
export function setTheme(choice: ThemeChoice): void {
  currentTheme = choice;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch (error) {
    // без хранилища тема держится до перезагрузки
    console.error(error);
  }
  applyTheme();
  for (const listener of listeners) {
    listener();
  }
}

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
