// Статусы песен, этапов и публикаций: порядок в списках выбора и подписи.
import { PostStatus } from '../types/post';

/** Подписи статусов публикации */
export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  [PostStatus.idea]: 'Идея',
  [PostStatus.preparing]: 'Готовится',
  [PostStatus.ready]: 'Готово',
  [PostStatus.published]: 'Опубликовано',
};

/** Статусы публикации по порядку */
export const POST_STATUSES: PostStatus[] = Object.values(PostStatus);
