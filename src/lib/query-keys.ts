import type { QueryKey } from '@tanstack/react-query';
import type { NoteScope, NoteSort } from './notes';
import type { CollectionResponses } from './pb-types';

// Ключи запросов TanStack Query - только отсюда: и для queryOptions, и для перечитывания и
// правок кэша. Кэш запросов лежит на устройстве (lib/offline.ts) под этими ключами: если форма
// ключа меняется, нужен новый CACHE_BUSTER, иначе старый кэш ляжет не туда.
//
// Первая часть ключа - корень. По корню перечитывает realtime (subscribeRealtime), по нему же
// оптимистичные правки (lib/optimistic.ts) отменяют, откатывают и перечитывают запросы, а
// lib/offline-sync.ts раскладывает списки по запросам отдельных записей.

export type QueryRoot =
  | 'projects'
  | 'songs'
  | 'stage_templates'
  | 'promo_templates'
  | 'users'
  | 'notes'
  | 'tasks'
  | 'posts'
  | 'file-token'
  | 'totp-setup';

export const queryKeys = {
  projects: {
    // список проектов; он же корень всех запросов проектов
    all: ['projects'],
    one: (id: string) => ['projects', id],
  },
  songs: {
    // корень: песни и их этапы
    all: ['songs'],
    // списки песен всех проектов
    lists: ['songs', 'project'],
    ofProject: (projectId: string) => ['songs', 'project', projectId],
    one: (id: string) => ['songs', id],
  },
  stageTemplates: {
    all: ['stage_templates'],
    ofProject: (projectId: string) => ['stage_templates', projectId],
  },
  promo: {
    all: ['promo_templates'],
    ofProject: (projectId: string) => ['promo_templates', projectId],
  },
  users: {
    all: ['users'],
  },
  notes: {
    all: ['notes'],
    // лента одного уровня: проекта, песни или этапа
    scope: (scope: NoteScope) => ['notes', scope.project, scope.song ?? '', scope.stage ?? ''],
    // раздел "Все заметки": фильтр и порядок
    search: (projectId: string, filter: string, sort: NoteSort) => [
      'notes',
      projectId,
      'all',
      filter,
      sort,
    ],
  },
  tasks: {
    all: ['tasks'],
    ofProject: (projectId: string) => ['tasks', projectId],
  },
  posts: {
    all: ['posts'],
    ofProject: (projectId: string) => ['posts', projectId],
  },
  fileToken: ['file-token'],
  totpSetup: (userId: string | undefined) => ['totp-setup', userId],
} as const;

// все запросы с этим корнем
export function rootKey(root: QueryRoot): QueryKey {
  return [root];
}

export function rootOf(key: QueryKey): string {
  return String(key[0]);
}

// список песен одного проекта: ['songs', 'project', projectId]
export function isProjectSongsKey(key: QueryKey): boolean {
  return key[0] === 'songs' && key[1] === 'project';
}

// список всех проектов: ['projects']
export function isProjectsKey(key: QueryKey): boolean {
  return key[0] === 'projects' && key.length === 1;
}

// Изменение записи коллекции PocketBase (realtime) перечитывает запросы с этим корнем. Этапы
// приходят внутри песен (expand), поэтому их изменения перечитывают песни. Порядок - порядок
// подписок.
export const REALTIME_ROOTS = {
  projects: 'projects',
  songs: 'songs',
  song_stages: 'songs',
  stage_templates: 'stage_templates',
  promo_templates: 'promo_templates',
  notes: 'notes',
  tasks: 'tasks',
  posts: 'posts',
} as const satisfies Partial<Record<keyof CollectionResponses, QueryRoot>>;
