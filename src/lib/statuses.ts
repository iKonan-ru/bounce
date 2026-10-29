import type { PostStatus, SongStatus, StageStatus } from './model';

// Статусы песен, этапов и публикаций: порядок в списках выбора и подписи.

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  idea: 'Идея',
  preparing: 'Готовится',
  ready: 'Готово',
  published: 'Опубликовано',
};
export const POST_STATUSES: PostStatus[] = ['idea', 'preparing', 'ready', 'published'];

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  not_started: 'Не начат',
  in_progress: 'В работе',
  done: 'Готово',
  skipped: 'Пропущен',
};

export const STAGE_STATUSES: StageStatus[] = ['not_started', 'in_progress', 'done', 'skipped'];

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  not_started: 'Не начата',
  active: 'В работе',
  paused: 'На паузе',
  done: 'Готова',
  sent: 'Отправлена на лейбл',
  released: 'Выпущена',
};

export const SONG_STATUSES: SongStatus[] = [
  'not_started',
  'active',
  'paused',
  'done',
  'sent',
  'released',
];
// Статусы, которые выбирают руками; "отправлена" - через раздел "Релиз", "выпущена" - сама.
// Новая песня "не начата"; когда этап берут в работу, сервер сам ставит "в работе".
export const MANUAL_SONG_STATUSES: SongStatus[] = ['not_started', 'active', 'paused', 'done'];
