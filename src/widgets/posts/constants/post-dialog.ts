import type { PostStatus } from '@/entities/post';
import { POST_STATUSES, POST_STATUS_LABEL, PostAnchor } from '@/entities/post';
import type { ChoiceOption } from '../types/post-dialog';

/** Значение "Без песни" в выборе песни */
export const NO_SONG = 'none';

/** Самый длинный текст поста */
export const POST_TEXT_MAX_LENGTH = 10000;

/** Самый большой сдвиг от релиза в днях, в обе стороны */
export const MAX_RELEASE_OFFSET_DAYS = 365;

/** Варианты статуса публикации */
export const STATUS_OPTIONS: readonly ChoiceOption<PostStatus>[] =
  POST_STATUSES.map((status) => ({
    value: status,
    label: POST_STATUS_LABEL[status],
  }));

/** Варианты отсчёта даты публикации песни */
export const ANCHOR_OPTIONS: readonly ChoiceOption<PostAnchor>[] = [
  { value: PostAnchor.release, label: 'От релиза' },
  { value: PostAnchor.date, label: 'Своя дата' },
];
