import {
  NOTE_DATE_FORMAT,
  DATE_WITH_YEAR_FORMAT,
  BYTES_IN_MEGABYTE,
  BYTES_IN_KILOBYTE,
  STORED_FILE_SUFFIX_RE,
  FILE_EXTENSION_RE,
  DAY_KEY_LENGTH,
  NOON_UTC_SUFFIX,
  DAY_MONTH_FORMAT,
} from '../constants/format';

/** Число двумя цифрами: 5 -> "05" */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** Дата PocketBase ("2026-10-29 12:00:00.000Z") как Date; пустая или неверная - null */
function parsePbDate(iso: string): Date | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso.replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/** Дата в этом году */
function checkIsThisYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear();
}

/** Дата записи ленты: в этом году - с временем, раньше - с годом */
export function getNoteDateLabel(iso: string): string {
  const date = parsePbDate(iso);

  if (!date) {
    return '';
  }

  if (checkIsThisYear(date)) {
    return NOTE_DATE_FORMAT.format(date);
  }

  return DATE_WITH_YEAR_FORMAT.format(date);
}

/** Размер файла: "12,3 МБ" или "512 КБ" (не меньше 1 КБ) */
export function getFileSizeLabel(bytes: number): string {
  if (bytes >= BYTES_IN_MEGABYTE) {
    const megabytes = (bytes / BYTES_IN_MEGABYTE).toFixed(1).replace('.', ',');

    return `${megabytes} МБ`;
  }

  const kilobytes = Math.max(1, Math.round(bytes / BYTES_IN_KILOBYTE));

  return `${kilobytes} КБ`;
}

/** Имя файла без суффикса, который PocketBase добавляет при сохранении (mix_a1b2c3d4e5.wav) */
export function getDisplayFileName(stored: string): string {
  return stored.replace(STORED_FILE_SUFFIX_RE, '$1');
}

/** Имя файла без расширения - название записи, если в тегах своего нет */
export function getBaseName(name: string): string {
  return name.replace(FILE_EXTENSION_RE, '');
}

/** День в местном времени: YYYY-MM-DD */
export function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
}

/** Календарный день даты PocketBase: даты без времени хранятся полднем UTC, первые 10 знаков - день */
export function getIsoDayKey(iso: string): string {
  return iso.slice(0, DAY_KEY_LENGTH);
}

/** Дата и время для PocketBase: "2026-10-29 07:30:00.000Z" */
export function convertToPbDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ');
}

/** Даты без времени (срок этапа, дата релиза) хранятся полднем UTC: в любом поясе это тот же день */
export function convertDayToPbDate(date: Date): string {
  return `${getDayKey(date)}${NOON_UTC_SUFFIX}`;
}

/** День из даты PocketBase - для календаря, в местном времени */
export function convertPbDateToDay(iso: string): Date | undefined {
  const date = parsePbDate(iso);

  if (!date) {
    return undefined;
  }

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Дата без времени: в этом году - день и месяц, раньше - с годом */
export function getDateLabel(iso: string): string {
  const date = parsePbDate(iso);

  if (!date) {
    return '';
  }

  if (checkIsThisYear(date)) {
    return DAY_MONTH_FORMAT.format(date);
  }

  return DATE_WITH_YEAR_FORMAT.format(date);
}

/** Срок прошёл: день срока уже закончился */
export function checkIsOverdue(iso: string): boolean {
  const date = parsePbDate(iso);

  if (!date) {
    return false;
  }

  const today = getIsoDayKey(new Date().toISOString());

  return getIsoDayKey(date.toISOString()) < today;
}
