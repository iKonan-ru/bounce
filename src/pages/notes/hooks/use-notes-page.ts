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
import { videosQuery } from '@/entities/video';
import { pb } from '@/shared/api';
import { CONTENT_DIRECTION_OPTIONS } from '@/shared/constants';
import { ContentDirection } from '@/shared/types';
import type { NoteScope } from '@/shared/types';
import { useProjectCrumbs } from '@/widgets/page-crumbs';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  SEARCH_DEBOUNCE_MS,
  LEVEL_LABEL,
  LEVEL_OPTIONS,
  NO_PENDING,
} from '../constants/notes';
import type { UseNotesPageResult, FilterChip } from '../types/notes';
import { useDebounced } from './use-debounced';
import { useNotesNavigation } from './use-notes-navigation';

/** Заметки проекта с поиском, фильтрами и сортировкой */
export function useNotesPage(): UseNotesPageResult {
  const params = useParams({ strict: false });
  const projectId = params.projectId ?? '';
  const crumbs = useProjectCrumbs(projectId);
  const navigation = useNotesNavigation(projectId);
  const songs = useQuery({
    ...songsQuery(projectId),
    enabled: Boolean(projectId),
  });
  const videos = useQuery({
    ...videosQuery(projectId),
    enabled: Boolean(projectId),
  });
  const people = useProjectPeople(projectId);
  const projectScope: NoteScope = { project: projectId };
  const pending = usePendingNotes(projectScope, true);
  const [filter, setFilter] = useState<NotesFilter>(EMPTY_NOTES_FILTER);
  const [sort, setSort] = useState<NoteSort>(NoteSort.Newest);
  // запрос - когда человек перестал набирать, а не на каждую букву
  const searchText = useDebounced(filter.text, SEARCH_DEBOUNCE_MS);
  const queryFilter = getNotesFilter(pb, projectId, {
    ...filter,
    text: searchText,
  });
  const access = useAccess(projectId);
  const directionOptions = CONTENT_DIRECTION_OPTIONS.filter(
    (option) =>
      (option.value !== ContentDirection.Music || access.isMusicEnabled) &&
      (option.value !== ContentDirection.Video || access.isVideoEnabled)
  ).map((option) => ({
    ...option,
    label: option.value === ContentDirection.All ? 'Все' : option.label,
  }));
  const levelOptions = LEVEL_OPTIONS.filter(
    (option) =>
      (option.value !== NoteLevel.Song || access.isMusicEnabled) &&
      (option.value !== NoteLevel.Video || access.isVideoEnabled)
  );
  const notes = useInfiniteQuery(allNotesQuery(projectId, queryFilter, sort));
  const noteList = notes.data?.pages.flatMap((page) => page.items) ?? [];
  const total = notes.data?.pages[0]?.totalItems ?? 0;

  const updateFilter = (patch: Partial<NotesFilter>): void => {
    setFilter({ ...filter, ...patch });
  };

  const songTitle = songs.data?.find((song) => song.id === filter.song)?.title;
  const authorName = people.find((user) => user.id === filter.author)?.name;
  const chips: FilterChip[] = [];

  if (filter.direction !== ContentDirection.All) {
    chips.push({
      label:
        CONTENT_DIRECTION_OPTIONS.find(
          (option) => option.value === filter.direction
        )?.label ?? '',
      onClear: () => updateFilter({ direction: ContentDirection.All }),
    });
  }

  if (filter.video) {
    chips.push({
      label:
        videos.data?.find((video) => video.id === filter.video)?.title ??
        'Видео',
      onClear: () => updateFilter({ video: '' }),
    });
  }

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
    const directions: Partial<Record<NoteLevel, ContentDirection>> = {
      [NoteLevel.Project]: ContentDirection.General,
      [NoteLevel.Song]: ContentDirection.Music,
      [NoteLevel.Video]: ContentDirection.Video,
    };
    let direction = directions[level] ?? filter.direction;

    if (level === NoteLevel.Stage && direction === ContentDirection.General) {
      direction = ContentDirection.All;
    }

    updateFilter({ level, direction, song: '', video: '' });
  };

  const onDirectionChange = (direction: ContentDirection): void => {
    updateFilter({ direction, song: '', video: '', level: NoteLevel.All });
  };
  const onSongChange = (song: string): void => {
    updateFilter({ song, video: '', direction: ContentDirection.Music });
  };
  const onVideoChange = (video: string): void => {
    updateFilter({ video, song: '', direction: ContentDirection.Video });
  };

  const onAuthorChange = (author: string): void => {
    updateFilter({ author });
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
    ...navigation,
    projectId,
    crumbs: projectId ? crumbs : [],
    canWriteNotes: !projectId || access.canWriteNotes,
    projectScope,
    filter,
    sort,
    setSort,
    songs: songs.data,
    videos: videos.data,
    directionOptions,
    levelOptions,
    onDirectionChange,
    onVideoChange,
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
