import { ThemeChoice } from '../types/theme';

/** Ключ темы в localStorage (его же читает index.html до загрузки приложения) */
export const THEME_KEY = 'bounce.theme';

/** Темы, которые сохраняются явно; без сохранённой - как в системе */
export const STORED_THEMES: readonly ThemeChoice[] = [
  ThemeChoice.Light,
  ThemeChoice.Dark,
];

/** Цвет рамки окна в тёмной теме */
export const DARK_THEME_COLOR = '#161a22';

/** Цвет рамки окна в светлой теме */
export const LIGHT_THEME_COLOR = '#eef0f3';
