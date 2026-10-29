import type { Service } from '@/entities/service';
import { MUSIC_SERVICES, OTHER_SERVICE } from '@/entities/service';

/** Строка ссылки в настройках */
export const LINK_ROW_CLASS_NAME =
  'flex min-h-12 items-center gap-3 px-4 transition-colors md:min-h-11';

/** Пробелы в вставленной ссылке */
export const WHITESPACE_RE = /\s+/g;

/** Все сервисы в меню: из списка и "другое" в конце */
export const ALL_SERVICES: readonly Service[] = [
  ...MUSIC_SERVICES,
  OTHER_SERVICE,
];

/** Клавиша отправки формы из поля ссылки */
export const SUBMIT_KEY = 'Enter';
