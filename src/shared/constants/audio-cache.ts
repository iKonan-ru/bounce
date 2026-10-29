import { BYTES_IN_MEGABYTE } from './format';

/** Кэш аудио service worker */
export const AUDIO_CACHE = 'bounce-audio';

/** Больше - не кэшируется (тот же предел в vite.config.ts): телефону это стоило бы памяти */
export const AUDIO_CACHE_MAX = 60 * BYTES_IN_MEGABYTE;

/** Дочитанный файл service worker кладёт в кэш не сразу: проверяем, пока не появится, но не больше 20 раз */
export const CACHE_CHECKS = 20;

/** Пауза между проверками кэша */
export const CACHE_CHECK_MS = 250;

/** Пока файл качается, доля не доходит до конца: целиком он на устройстве, когда попал в кэш */
export const DOWNLOADING_FRACTION_MAX = 0.99;

/** Шаг, с которым сообщается доля скачанного: процент */
export const PROGRESS_STEP = 0.01;

/** Запись целиком на устройстве */
export const FULL_FRACTION = 1;
