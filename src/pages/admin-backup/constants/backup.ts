import { MINUTE_MS, SECOND_MS } from '@/shared/constants';

/** Сколько ждать сервер после восстановления */
export const RESTORE_TIMEOUT_MS = 10 * MINUTE_MS;

/** Пауза перед первой проверкой: сначала сервер уходит на перезапуск */
export const RESTART_GRACE_MS = 1.5 * SECOND_MS;

/** Пауза между проверками сервера */
export const HEALTH_CHECK_INTERVAL_MS = SECOND_MS;

/** С этого статуса ответ - отказ сервера, а не обрыв из-за перезапуска */
export const REFUSAL_STATUS_MIN = 400;
