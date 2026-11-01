// Ключи запросов TanStack Query - только отсюда: и для queryOptions, и для перечитывания и
// правок кэша. Кэш запросов лежит на устройстве (shared/api/offline.ts) под этими ключами: если форма
// ключа меняется, нужен новый CACHE_BUSTER, иначе старый кэш ляжет не туда.
//
// Первая часть ключа - корень. По корню перечитывает realtime (subscribeRealtime), по нему же
// оптимистичные правки (shared/api/optimistic.ts) отменяют, откатывают и перечитывают запросы, а
// features/offline-sync раскладывает списки по запросам отдельных записей.
import type { QueryKey } from '@tanstack/react-query';
import { PROJECT_SEGMENT, ALL_NOTES_SEGMENT } from '../constants/query-keys';
import { QueryRoot } from '../types/query-keys';
import type { NoteScope } from '../types/scope';

/** Ключи всех запросов приложения */
export const queryKeys = {
  projects: {
    /** Список проектов; он же корень всех запросов проектов */
    all: [QueryRoot.Projects],
    one: (id: string) => [QueryRoot.Projects, id],
    directions: (id: string) => [QueryRoot.Projects, id, 'directions'],
  },
  songs: {
    /** Корень: песни и их этапы */
    all: [QueryRoot.Songs],
    /** Списки песен всех проектов */
    lists: [QueryRoot.Songs, PROJECT_SEGMENT],
    ofProject: (projectId: string) => [
      QueryRoot.Songs,
      PROJECT_SEGMENT,
      projectId,
    ],
    one: (id: string) => [QueryRoot.Songs, id],
  },
  videos: {
    all: [QueryRoot.Videos],
    ofProject: (projectId: string) => [
      QueryRoot.Videos,
      PROJECT_SEGMENT,
      projectId,
    ],
    one: (id: string) => [QueryRoot.Videos, id],
  },
  projectTasks: {
    all: [QueryRoot.ProjectTasks],
    ofProject: (projectId: string) => [QueryRoot.ProjectTasks, projectId],
  },
  taskStages: {
    all: [QueryRoot.TaskStages],
    ofProject: (projectId: string) => [QueryRoot.TaskStages, projectId],
  },
  stageTemplates: {
    all: [QueryRoot.StageTemplates],
    ofProject: (projectId: string, direction = 'music') => [
      QueryRoot.StageTemplates,
      projectId,
      direction,
    ],
  },
  promo: {
    all: [QueryRoot.PromoTemplates],
    ofProject: (projectId: string) => [QueryRoot.PromoTemplates, projectId],
  },
  users: {
    all: [QueryRoot.Users],
  },
  notes: {
    all: [QueryRoot.Notes],
    /** Лента одного уровня: проекта, песни или этапа */
    scope: (scope: NoteScope) => [
      QueryRoot.Notes,
      scope.project,
      scope.song ?? '',
      scope.stage ?? '',
      scope.video ?? '',
      scope.video_stage ?? '',
      ...(scope.other
        ? [
            'other',
            scope.other_stage ?? '',
            ...(scope.project_task ? [scope.project_task] : []),
          ]
        : []),
    ],
    /** Раздел "Все заметки": фильтр и порядок */
    search: (projectId: string, filter: string, sort: string) => [
      QueryRoot.Notes,
      projectId,
      ALL_NOTES_SEGMENT,
      filter,
      sort,
    ],
  },
  tasks: {
    all: [QueryRoot.Tasks],
    ofProject: (projectId: string) => [QueryRoot.Tasks, projectId],
  },
  posts: {
    all: [QueryRoot.Posts],
    ofProject: (projectId: string) => [QueryRoot.Posts, projectId],
  },
  videoPosts: {
    all: [QueryRoot.VideoPosts],
    ofProject: (projectId: string) => [QueryRoot.VideoPosts, projectId],
  },
  fileToken: [QueryRoot.FileToken],
  totpSetup: (userId: string | undefined) => [QueryRoot.TotpSetup, userId],
} as const;

/** Все запросы с этим корнем */
export function getRootKey(root: QueryRoot): QueryKey {
  return [root];
}

/** Корень ключа запроса */
export function getKeyRoot(key: QueryKey): string {
  return String(key[0]);
}

/** Список песен одного проекта: [QueryRoot.Songs, PROJECT_SEGMENT, projectId] */
export function checkIsProjectSongsKey(key: QueryKey): boolean {
  return key[0] === QueryRoot.Songs && key[1] === PROJECT_SEGMENT;
}

/** Список видео одного проекта: [QueryRoot.Videos, PROJECT_SEGMENT, projectId] */
export function checkIsProjectVideosKey(key: QueryKey): boolean {
  return key[0] === QueryRoot.Videos && key[1] === PROJECT_SEGMENT;
}

/** Список всех проектов: [QueryRoot.Projects] */
export function checkIsProjectsKey(key: QueryKey): boolean {
  return key[0] === QueryRoot.Projects && key.length === 1;
}
