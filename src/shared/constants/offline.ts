import { DAY_MS, SECOND_MS } from './format';

/** Сколько дней хранится кэш запросов на устройстве */
const CACHE_MAX_AGE_DAYS = 14;

/** Срок хранения кэша запросов на устройстве */
export const CACHE_MAX_AGE = CACHE_MAX_AGE_DAYS * DAY_MS;

/**
 * Версия кэша запросов
 *
 * При смене схемы данных или формы запроса ("Все заметки" стали постраничными) - новое
 * значение: старый кэш на устройствах отбрасывается
 */
export const CACHE_BUSTER = 'schema-1763600000';

/** Кэш картинок service worker */
export const FILES_CACHE = 'bounce-files';

/** Ключ кэша запросов в хранилище */
export const PERSISTER_KEY = 'bounce';

/** Как часто кэш запросов записывается на устройство */
export const PERSIST_THROTTLE_MS = SECOND_MS;
