import type { ListResult } from 'pocketbase';
import { queryKeys, getCollection, pb, Collections } from '@/shared/api';
import type { NoteScope } from '@/shared/types';
import {
  queryOptions,
  infiniteQueryOptions,
  keepPreviousData,
} from '@tanstack/react-query';
import { NOTE_EXPAND } from '../constants/notes';
import { NOTES_PAGE, NOTE_SORT_FIELD } from '../constants/queries';
import type { Note } from '../types/note';
import type { NoteSort } from '../types/notes';
import { getScopeFilter } from '../utils/notes';

/** Номер следующей страницы; последняя - undefined */
function getNextPage(page: ListResult<Note>): number | undefined {
  if (page.page >= page.totalPages) {
    return undefined;
  }

  return page.page + 1;
}

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
