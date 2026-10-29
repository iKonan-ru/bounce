/** Байт в килобайте */
export const BYTES_IN_KILOBYTE = 1024;

/** Байт в мегабайте */
export const BYTES_IN_MEGABYTE = BYTES_IN_KILOBYTE * BYTES_IN_KILOBYTE;

/** Миллисекунд в секунде */
export const SECOND_MS = 1000;

/** Миллисекунд в минуте */
export const MINUTE_MS = 60 * SECOND_MS;

/** Миллисекунд в сутках */
export const DAY_MS = 24 * 60 * MINUTE_MS;

/** Длина дня в формате YYYY-MM-DD: первые знаки даты PocketBase */
export const DAY_KEY_LENGTH = 10;

/** Локаль дат в интерфейсе */
const DATE_LOCALE = 'ru-RU';

/** Дата записи ленты в этом году: день, месяц и время */
export const NOTE_DATE_FORMAT = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Дата с годом: для прошлых лет */
export const DATE_WITH_YEAR_FORMAT = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Дата без года: для этого года */
export const DAY_MONTH_FORMAT = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
});

/** Суффикс, который PocketBase добавляет к имени файла при сохранении (mix_a1b2c3d4e5.wav) */
export const STORED_FILE_SUFFIX_RE = /_[a-z0-9]{10}(\.[^.]+)$/i;

/** Расширение файла */
export const FILE_EXTENSION_RE = /\.[a-z0-9]{2,4}$/i;

/** Время дат без времени: полдень UTC */
export const NOON_UTC_SUFFIX = ' 12:00:00.000Z';
