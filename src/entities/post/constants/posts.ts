import { PostStatus } from '../types/post';

/** Дней в неделе */
export const DAYS_IN_WEEK = 7;

/** До скольки дней сдвиг в целых неделях пишется неделями: до четырёх недель */
export const WEEKS_SPAN_MAX_DAYS = 28;

/** Ключ сортировки публикации без даты: в конце списка */
export const NO_DATE_SORT_KEY = '9999';

/** Основание десятичной системы: последняя цифра числа */
export const DECIMAL_BASE = 10;

/** Две последние цифры числа */
export const HUNDRED = 100;

/** Числа от 11 до 14 склоняются как "много": 11 дней, 12 недель */
export const TEEN_MIN = 11;

export const TEEN_MAX = 14;

/** Последние цифры, с которыми число склоняется как "несколько": 2, 3, 4 */
export const FEW_MIN = 2;

export const FEW_MAX = 4;

/** Цвет точки статуса публикации */
export const POST_STATUS_DOT: Record<PostStatus, string> = {
  [PostStatus.idea]: 'bg-led-off',
  [PostStatus.preparing]: 'bg-led-amber',
  [PostStatus.ready]: 'bg-led-cyan',
  [PostStatus.published]: 'bg-led-green',
};
