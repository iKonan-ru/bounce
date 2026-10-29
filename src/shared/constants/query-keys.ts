import type { CollectionResponses } from '../api/pb-types';
import { Collections } from '../api/pb-types';
import { QueryRoot } from '../types/query-keys';

/** Вторая часть ключа списков песен проекта */
export const PROJECT_SEGMENT = 'project';

/** Третья часть ключа раздела "Все заметки" */
export const ALL_NOTES_SEGMENT = 'all';

/**
 * Изменение записи коллекции PocketBase (realtime) перечитывает запросы с этим корнем
 *
 * Этапы приходят внутри песен (expand), поэтому их изменения перечитывают песни. Порядок -
 * порядок подписок
 */
export const REALTIME_ROOTS = {
  [Collections.Projects]: QueryRoot.Projects,
  [Collections.Songs]: QueryRoot.Songs,
  [Collections.SongStages]: QueryRoot.Songs,
  [Collections.StageTemplates]: QueryRoot.StageTemplates,
  [Collections.PromoTemplates]: QueryRoot.PromoTemplates,
  [Collections.Notes]: QueryRoot.Notes,
  [Collections.Tasks]: QueryRoot.Tasks,
  [Collections.Posts]: QueryRoot.Posts,
} as const satisfies Partial<Record<keyof CollectionResponses, QueryRoot>>;
