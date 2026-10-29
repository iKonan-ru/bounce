import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { NotesFilter } from '@/entities/note';
import {
  usePendingNotes,
  EMPTY_NOTES_FILTER,
  NoteSort,
  getNotesFilter,
  allNotesQuery,
  NoteLevel,
} from '@/entities/note';
import { useProjectPeople, useAccess } from '@/entities/project';
import { songsQuery } from '@/entities/song';
import { pb } from '@/shared/api';
import type { NoteScope } from '@/shared/types';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  SEARCH_DEBOUNCE_MS,
  LEVEL_LABEL,
  NO_PENDING,
} from '../constants/notes';
import type { UseNotesPageResult, FilterChip } from '../types/notes';
import { useDebounced } from './use-debounced';

/** Заметки проекта с поиском, фильтрами и сортировкой */
export function useNotesPage(): UseNotesPageResult {
  const { projectId } = useParams({ from: '/app/p/$projectId/notes' });
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const people = useProjectPeople(projectId);
  const projectScope: NoteScope = { project: projectId };
  const pending = usePendingNotes(projectScope);
  const [filter, setFilter] = useState<NotesFilter>(EMPTY_NOTES_FILTER);
  const [sort, setSort] = useState<NoteSort>(NoteSort.Newest);
  // запрос - когда человек перестал набирать, а не на каждую букву
  const searchText = useDebounced(filter.text, SEARCH_DEBOUNCE_MS);
  const queryFilter = getNotesFilter(pb, projectId, {
    ...filter,
    text: searchText,
  });
  const access = useAccess(projectId);
  const notes = useInfiniteQuery(allNotesQuery(projectId, queryFilter, sort));
  const noteList = notes.data?.pages.flatMap((page) => page.items) ?? [];
  const total = notes.data?.pages[0]?.totalItems ?? 0;

  const updateFilter = (patch: Partial<NotesFilter>): void => {
    setFilter({ ...filter, ...patch });
  };

  const songTitle = songs.data?.find((song) => song.id === filter.song)?.title;
  const authorName = people.find((user) => user.id === filter.author)?.name;
  const chips: FilterChip[] = [];

  if (filter.level !== NoteLevel.All) {
    chips.push({
      label: LEVEL_LABEL[filter.level],
      onClear: () => {
        updateFilter({ level: NoteLevel.All });
      },
    });
  }

  if (filter.song) {
    chips.push({
      label: songTitle ?? 'Песня',
      onClear: () => {
        updateFilter({ song: '' });
      },
    });
  }

  if (filter.author) {
    chips.push({
      label: authorName ?? 'Автор',
      onClear: () => {
        updateFilter({ author: '' });
      },
    });
  }

  if (filter.hasImages) {
    chips.push({
      label: 'С картинками',
      onClear: () => {
        updateFilter({ hasImages: false });
      },
    });
  }

  const hasText = filter.text.trim() !== '';
  const hasChips = chips.length > 0;
  const isFiltered = hasText || hasChips;
  const hasNoNotes = noteList.length === 0 && pending.length === 0;
  const isEmpty = Boolean(notes.data) && hasNoNotes;
  const isLoadFailed = notes.isError && !notes.data;
  const shownPending = isFiltered ? NO_PENDING : pending;

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    updateFilter({ text: event.target.value });
  };

  const onLevelChange = (level: NoteLevel): void => {
    updateFilter({ level });
  };

  const onSongChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    updateFilter({ song: event.target.value });
  };

  const onAuthorChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    updateFilter({ author: event.target.value });
  };

  const onImagesCheckedChange = (
    checked: CheckboxPrimitive.CheckedState
  ): void => {
    updateFilter({ hasImages: checked === true });
  };

  const onResetClick = (): void => {
    setFilter({ ...EMPTY_NOTES_FILTER, text: filter.text });
  };

  const onMoreClick = (): void => {
    void notes.fetchNextPage();
  };

  return {
    projectId,
    crumbs,
    canWork: access.canWork,
    projectScope,
    filter,
    sort,
    setSort,
    songs: songs.data,
    people,
    chips,
    notes: noteList,
    shownPending,
    total,
    isPending: notes.isPending,
    isLoadFailed,
    isEmpty,
    isFiltered,
    isPlaceholder: notes.isPlaceholderData,
    hasNextPage: notes.hasNextPage,
    isFetchingNextPage: notes.isFetchingNextPage,
    onSearchChange,
    onLevelChange,
    onSongChange,
    onAuthorChange,
    onImagesCheckedChange,
    onResetClick,
    onMoreClick,
  };
}
