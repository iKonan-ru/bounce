import { cn } from '../utils/cn';

/** Крошка активна только на своей странице, а не на вложенных */
export const EXACT_ACTIVE_OPTIONS = { exact: true } as const;

/** Сгруппированный список: одна подложка */
export const GROUP =
  'overflow-hidden rounded-xl bg-panel ring-1 ring-border/70 dark:ring-border/40';

/** Сгруппированный список: одна подложка, строки через тонкие разделители */
export const GROUP_ROWS = cn(
  GROUP,
  'divide-y divide-border/70 dark:divide-border/50'
);
