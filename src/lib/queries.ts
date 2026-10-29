// Фабрики параметров запросов TanStack Query. Типы результата выводит сама библиотека: в них
// зашит тип данных ключа (DataTag), и вручную их не повторить без потери этой связи.
import type { ListResult } from 'pocketbase';
import {
  queryKeys,
  getCollection,
  pb,
  Collections,
  getProjectFilter,
} from '@/shared/api';
import { DAY_MS } from '@/shared/constants';
import type { NoteScope } from '@/shared/types';
import { convertToPbDateTime } from '@/shared/utils';
import {
  queryOptions,
  infiniteQueryOptions,
  keepPreviousData,
} from '@tanstack/react-query';
import type {
  Note,
  Project,
  SongWithStages,
  PromoStep,
  StageTemplate,
  User,
  Task,
  Post,
} from './model';
import type { NoteSort } from './notes';
import { getScopeFilter, NOTE_EXPAND } from './notes';

/** Этапы песни приходят вместе с ней */
const SONG_EXPAND = 'song_stages_via_song';

/** Люди проекта приходят вместе с ним */
const PROJECT_EXPAND = 'owner,editors,contributors,viewers';

/** Порядок заметок в разделе "Все заметки" */
const NOTE_SORT_FIELD: Record<NoteSort, string> = {
  new: '-created',
  old: 'created',
};

/** Выполненные задачи в плане видны две недели */
const DONE_TASKS_VISIBLE_DAYS = 14;

/**
 * Раздел "Все заметки": сколько заметок в одной странице
 *
 * Заметки приходят страницами - весь проект за раз (с авторами, песнями и этапами) не грузится
 */
export const NOTES_PAGE = 40;

/** Номер следующей страницы; последняя - undefined */
function getNextPage(page: ListResult<Note>): number | undefined {
  if (page.page >= page.totalPages) {
    return undefined;
  }

  return page.page + 1;
}

/** Все проекты, доступные пользователю */
export const projectsQuery = queryOptions({
  queryKey: queryKeys.projects.all,
  queryFn: () =>
    getCollection(pb, Collections.Projects).getFullList<Project>({
      sort: 'name',
      expand: PROJECT_EXPAND,
    }),
});

/** Проект с людьми */
export function projectQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.projects.one(id),
    queryFn: () =>
      getCollection(pb, Collections.Projects).getOne<Project>(id, {
        expand: PROJECT_EXPAND,
      }),
  });
}

/** Песни проекта с этапами, по ручному порядку */
export function songsQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.songs.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.Songs).getFullList<SongWithStages>({
        filter: getProjectFilter(projectId),
        sort: 'position,-created',
        expand: SONG_EXPAND,
      }),
  });
}

/** Песня с этапами */
export function songQuery(id: string) {
  return queryOptions({
    queryKey: queryKeys.songs.one(id),
    queryFn: () =>
      getCollection(pb, Collections.Songs).getOne<SongWithStages>(id, {
        expand: SONG_EXPAND,
      }),
  });
}

/** Промо-план проекта - по дням от релиза */
export function promoQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.promo.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.PromoTemplates).getFullList<PromoStep>({
        filter: getProjectFilter(projectId),
        sort: 'offset,created',
      }),
  });
}

/** Шаблон этапов проекта */
export function templatesQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.stageTemplates.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.StageTemplates).getFullList<StageTemplate>({
        filter: getProjectFilter(projectId),
        sort: 'position',
      }),
  });
}

/** Все пользователи по имени */
export const usersQuery = queryOptions({
  queryKey: queryKeys.users.all,
  queryFn: () =>
    getCollection(pb, Collections.Users).getFullList<User>({ sort: 'name' }),
});

/** Лента заметок одного уровня: сначала новые */
export function notesQuery(scope: NoteScope) {
  return queryOptions({
    queryKey: queryKeys.notes.scope(scope),
    queryFn: () =>
      getCollection(pb, Collections.Notes).getFullList<Note>({
        filter: getScopeFilter(pb, scope),
        sort: '-created',
        expand: NOTE_EXPAND,
      }),
  });
}

/**
 * Раздел "Все заметки": фильтр собирает notesFilter
 *
 * Пока ищется новый фильтр, на экране остаётся прежний результат, а не заглушка
 */
export function allNotesQuery(
  projectId: string,
  filter: string,
  sort: NoteSort
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.notes.search(projectId, filter, sort),
    queryFn: ({ pageParam }) =>
      getCollection(pb, Collections.Notes).getList<Note>(
        pageParam,
        NOTES_PAGE,
        {
          filter,
          sort: NOTE_SORT_FIELD[sort],
          expand: NOTE_EXPAND,
        }
      ),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
    placeholderData: keepPreviousData,
  });
}

/** Задачи планировщика: открытые и выполненные за последние две недели */
export function tasksQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.tasks.ofProject(projectId),
    queryFn: () => {
      const since = convertToPbDateTime(
        new Date(Date.now() - DONE_TASKS_VISIBLE_DAYS * DAY_MS)
      );

      return getCollection(pb, Collections.Tasks).getFullList<Task>({
        filter: pb.filter(
          'project = {:project} && (done = false || done_at >= {:since})',
          {
            project: projectId,
            since,
          }
        ),
        sort: 'created',
      });
    },
  });
}

/** Контент-план проекта: все публикации */
export function postsQuery(projectId: string) {
  return queryOptions({
    queryKey: queryKeys.posts.ofProject(projectId),
    queryFn: () =>
      getCollection(pb, Collections.Posts).getFullList<Post>({
        filter: getProjectFilter(projectId),
        sort: 'created',
      }),
  });
}
