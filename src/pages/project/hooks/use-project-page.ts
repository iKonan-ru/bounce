import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/entities/project';
import { getProjectPeople, projectQuery, useAccess } from '@/entities/project';
import type { Song, SongWithStages } from '@/entities/song';
import { getSongStatus, songsQuery } from '@/entities/song';
import type { User } from '@/entities/user';
import {
  Collections,
  queryKeys,
  applyOptimisticEdit,
  savePositions,
  pb,
} from '@/shared/api';
import { useFieldUpload } from '@/shared/hooks';
import type { FileRecord, PageHeaderEdit } from '@/shared/types';
import { QueryRoot } from '@/shared/types';
import { moveItemById } from '@/shared/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  OUT_STATUSES,
  PROJECT_ROUTE_ID,
  AVATAR_FIELD,
  AVATAR_THUMBS,
  ESCAPE_KEY,
  SONG_FILTERS,
} from '../constants/project';
import type {
  SongFilter,
  FilterCount,
  UseProjectPageResult,
} from '../types/project';
import { FilterOption } from '../types/project';

/** Песня уже ушла из работы: отправлена на лейбл или выпущена */
function checkIsSentOrReleased(song: Song): boolean {
  return OUT_STATUSES.has(getSongStatus(song));
}

/** Песня ещё в работе */
function checkIsWorking(song: Song): boolean {
  return !checkIsSentOrReleased(song);
}

/** По ручному порядку; при равном месте - сначала новые */
function compareByPosition(first: Song, second: Song): number {
  const positionDiff = (first.position ?? 0) - (second.position ?? 0);

  if (positionDiff !== 0) {
    return positionDiff;
  }

  return second.created.localeCompare(first.created);
}

/** Дата для сортировки по релизу: дата релиза, без неё - дата создания */
function getReleaseKey(song: Song): string {
  return song.target_release || song.created;
}

/** По релизу - от новых к старым */
function compareByRelease(first: Song, second: Song): number {
  return getReleaseKey(second).localeCompare(getReleaseKey(first));
}

/** Песня на своём месте ручного порядка */
function checkIsInPlace(song: Song, index: number): boolean {
  return (song.position ?? 0) === index;
}

/** Песня подходит под фильтр */
function checkMatchesFilter(song: Song, songFilter: SongFilter): boolean {
  if (songFilter === FilterOption.All) {
    return true;
  }

  return getSongStatus(song) === songFilter;
}

/** Сколько песен подходит под фильтр */
function countSongs(songs: readonly Song[], songFilter: SongFilter): number {
  return songs.filter((song) => checkMatchesFilter(song, songFilter)).length;
}

/** Фильтр виден: "Все" - всегда, статус - если есть такие песни */
function checkIsFilterShown(filterCount: FilterCount): boolean {
  if (filterCount.songFilter === FilterOption.All) {
    return true;
  }

  return filterCount.count > 0;
}

/** Люди проекта; проект ещё не загружен - никого */
function getPeopleUsers(project: Project | undefined): User[] {
  if (!project) {
    return [];
  }

  return getProjectPeople(project).map((person) => person.user);
}

/** Песни проекта, фильтр по статусу и режим ручного порядка */
export function useProjectPage(): UseProjectPageResult {
  const { projectId } = useParams({ from: PROJECT_ROUTE_ID });
  const project = useQuery(projectQuery(projectId));
  const songs = useQuery(songsQuery(projectId));
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<SongFilter>(FilterOption.All);
  const access = useAccess(projectId);
  const queryClient = useQueryClient();
  // пока проект не загружен, картинка грузится в запись с его id
  const avatarRecord: FileRecord = project.data ?? {
    id: projectId,
    collectionId: '',
    collectionName: Collections.Projects,
  };
  // нажатие на пустой аватар проекта - загрузка картинки (только владелец)
  const avatar = useFieldUpload({
    record: avatarRecord,
    field: AVATAR_FIELD,
    thumbs: AVATAR_THUMBS,
    refresh: queryKeys.projects.all,
  });

  const people = getPeopleUsers(project.data);
  const allSongs = songs.data ?? [];
  const filteredSongs = allSongs.filter((song) =>
    checkMatchesFilter(song, filter)
  );
  const workingSongs = allSongs.filter(checkIsWorking).sort(compareByPosition);

  // Режим порядка: песни в работе переставляются перетаскиванием, порядок применяется кнопкой
  // "Готово", нажатием вне списка, Escape или уходом со страницы.
  const [orderingSongs, setOrderingSongs] = useState<SongWithStages[] | null>(
    null
  );
  const orderingSongsRef = useRef(orderingSongs);
  orderingSongsRef.current = orderingSongs;
  const listRef = useRef<HTMLDivElement>(null);
  const orderToggleRef = useRef<HTMLButtonElement>(null);
  const isOrdering = orderingSongs !== null;

  // useCallback нужен для корректности: функция - зависимость эффектов ниже, и с новой ссылкой
  // на каждой отрисовке эффект ухода со страницы применял бы порядок при каждой отрисовке
  const handleOrderApply = useCallback((): void => {
    const ordered = orderingSongsRef.current;
    setOrderingSongs(null);

    if (!ordered) {
      return;
    }

    const isUnchanged = ordered.every(checkIsInPlace);

    if (isUnchanged) {
      return;
    }

    const positionById = new Map(
      ordered.map((song, index) => [song.id, index])
    );
    void applyOptimisticEdit(
      queryClient,
      QueryRoot.Songs,
      () =>
        queryClient.setQueryData(songsQuery(projectId).queryKey, (cached) =>
          cached?.map((song) => ({
            ...song,
            position: positionById.get(song.id) ?? song.position,
          }))
        ),
      () => savePositions(pb, Collections.Songs, ordered)
    ).catch(() => toast.error('Порядок не сохранился: проверьте соединение'));
  }, [queryClient, projectId]);

  useEffect(() => {
    if (!isOrdering) {
      return;
    }

    const onDocumentPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const isInList = listRef.current?.contains(target);
      const isOnToggle = orderToggleRef.current?.contains(target);
      const isInside = isInList || isOnToggle;

      if (isInside) {
        return;
      }

      handleOrderApply();
    };
    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) {
        handleOrderApply();
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    return (): void => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isOrdering, handleOrderApply]);

  // ушли со страницы, не нажав "Готово" - порядок всё равно сохраняется
  useEffect(
    () => (): void => {
      handleOrderApply();
    },
    [handleOrderApply]
  );

  // в работе - ручной порядок; отправленные и выпущенные - ниже, от новых к старым
  const mainSongs =
    orderingSongs ??
    filteredSongs.filter(checkIsWorking).sort(compareByPosition);
  const outSongs = filteredSongs
    .filter(checkIsSentOrReleased)
    .sort(compareByRelease);
  const filterCounts = SONG_FILTERS.map((songFilter) => ({
    songFilter,
    count: countSongs(allSongs, songFilter),
  })).filter(checkIsFilterShown);
  const canOrder = access.canEdit && workingSongs.length > 1;
  const hasLoadError = !songs.isPending && !songs.data;

  let headerEdit: PageHeaderEdit | undefined;

  if (access.canEdit) {
    headerEdit = {
      link: { to: '/p/$projectId/settings', params: { projectId } },
      label: 'Настройки проекта',
    };
  }

  const onNewSongClick = (): void => {
    setIsCreating(true);
  };

  const onOrderToggleClick = (): void => {
    if (isOrdering) {
      handleOrderApply();

      return;
    }

    setFilter(FilterOption.All);
    setOrderingSongs(workingSongs);
  };

  const onSongsReorder = (from: string, to: string): void => {
    setOrderingSongs(
      (current: SongWithStages[] | null): SongWithStages[] | null => {
        if (!current) {
          return current;
        }

        return moveItemById(current, from, to);
      }
    );
  };

  const handleFilterSelect = (songFilter: SongFilter): void => {
    setFilter(songFilter);
  };

  return {
    projectId,
    project: project.data,
    songs,
    canEdit: access.canEdit,
    onAvatarPick: access.canManage ? avatar.pick : undefined,
    pendingAvatar: avatar.pending,
    headerEdit,
    people,
    hasPeople: people.length > 0,
    hasSongs: allSongs.length > 0,
    hasNoSongs: songs.data?.length === 0,
    hasLoadError,
    filter,
    filterCounts,
    isCreating,
    setIsCreating,
    isOrdering,
    canOrder,
    isFilteredEmpty: filteredSongs.length === 0,
    mainSongs,
    outSongs,
    listRef,
    orderToggleRef,
    onNewSongClick,
    onOrderToggleClick,
    onSongsReorder,
    handleFilterSelect,
  };
}
