import { SECOND_MS, MINUTE_MS } from '@/shared/constants';

/** Первый повтор, пока сервер недоступен, а браузер считает, что сеть есть (события online не будет) */
export const RETRY_FIRST = 30 * SECOND_MS;

/** Самая длинная пауза между повторами */
export const RETRY_MAX = 10 * MINUTE_MS;

/** Во сколько раз растёт пауза между повторами */
export const RETRY_BACKOFF = 2;

/** Блокировка очереди на все окна приложения */
export const OUTBOX_LOCK = 'bounce-outbox';
