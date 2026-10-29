import type { SegmentedOption } from '@/shared/types';
import { ReleaseTiming } from '../types/promo-template';

/** Наименьшее число дней до или после релиза */
export const MIN_DAYS = 1;

/** Наибольшее число дней до или после релиза */
export const MAX_DAYS = 365;

/** Наибольшая длина названия публикации */
export const TITLE_MAX_LENGTH = 300;

/** Наибольшая длина числа дней в поле */
export const DAYS_MAX_LENGTH = 3;

/** Наибольшая длина комментария */
export const COMMENT_MAX_LENGTH = 2000;

/** Всё, кроме цифр: в поле дней не набирается */
export const NON_DIGIT_RE = /\D/g;

/** Перенос строки */
export const LINE_BREAK = '\n';

/** Разделитель срока и начала комментария в строке публикации */
export const COMMENT_SEPARATOR = ' \u00B7 ';

/** Сдвиг публикации до релиза: дни идут со знаком минус */
export const BEFORE_SIGN = -1;

/** Сдвиг публикации после релиза: дни идут со знаком плюс */
export const AFTER_SIGN = 1;

/** Варианты "когда" */
export const TIMING_OPTIONS: readonly SegmentedOption<ReleaseTiming>[] = [
  { value: ReleaseTiming.Before, label: 'До релиза' },
  { value: ReleaseTiming.Day, label: 'В день' },
  { value: ReleaseTiming.After, label: 'После' },
];
