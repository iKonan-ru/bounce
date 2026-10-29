import type { Crumb } from '@/shared/types';
import type { IdleStep, RestoreStep } from '../types/admin-backup';
import { StepKind } from '../types/admin-backup';

/** Шаг до начала восстановления */
export const IDLE_STEP: IdleStep = { kind: StepKind.Idle };

/** Шаг восстановления на сервере */
export const RESTORE_STEP: RestoreStep = { kind: StepKind.Restore };

/** Множитель доли в проценты */
export const PERCENT = 100;

/** Путь к странице: из профиля */
export const BACKUP_CRUMBS: readonly Crumb[] = [
  { label: 'Профиль', link: { to: '/me' } },
];
