import type { RefObject, ReactNode } from 'react';
import type { Project } from '@/entities/project';
import type { SongWithStages, SongStage, SongStatus } from '@/entities/song';
import type { User } from '@/entities/user';
import type { PendingImage, PageHeaderEdit } from '@/shared/types';
import type { UseQueryResult } from '@tanstack/react-query';

/** Фильтр списка песен без отбора по статусу */
export enum FilterOption {
  /** Все песни */
  All = 'all',
}

/** Фильтр списка песен: все или один статус */
export type SongFilter = SongStatus | FilterOption;

/** Фильтр со счётчиком песен */
export interface FilterCount {
  songFilter: SongFilter;
  count: number;
}

/** Края полосы, за которыми есть ещё */
export interface ScrollEdges {
  hasMoreLeft: boolean;
  hasMoreRight: boolean;
}

/** Пропсы строки песни */
export interface SongRowProps {
  song: SongWithStages;
  projectId: string;
  /** Режим порядка: строку тянут, она не ссылка */
  isOrdering?: boolean;
}

/** Пропсы содержимого строки песни */
export interface SongRowContentProps {
  song: SongWithStages;
  isOrdering: boolean;
}

/** Пропсы прогресса песни */
export interface SongProgressProps {
  stages: SongStage[];
  /** Дата релиза; пусто - не назначена */
  releaseLabel: string;
}

/** Результат хука страницы проекта */
export interface UseProjectPageResult {
  projectId: string;
  project: Project | undefined;
  songs: UseQueryResult<SongWithStages[]>;
  canEdit: boolean;
  onAvatarPick: ((file: File) => void) | undefined;
  pendingAvatar: PendingImage | undefined;
  /** Ссылка на настройки в шапке: только у тех, кто правит проект */
  headerEdit: PageHeaderEdit | undefined;
  people: User[];
  hasPeople: boolean;
  hasSongs: boolean;
  hasNoSongs: boolean;
  hasLoadError: boolean;
  filter: SongFilter;
  filterCounts: FilterCount[];
  isCreating: boolean;
  setIsCreating: (isCreating: boolean) => void;
  isOrdering: boolean;
  /** Порядок можно менять: правит проект и песен в работе больше одной */
  canOrder: boolean;
  /** Отбор фильтром ничего не оставил */
  isFilteredEmpty: boolean;
  /** В работе - ручной порядок */
  mainSongs: SongWithStages[];
  /** Отправленные и выпущенные - от новых к старым */
  outSongs: SongWithStages[];
  listRef: RefObject<HTMLDivElement | null>;
  orderToggleRef: RefObject<HTMLButtonElement | null>;
  onNewSongClick: () => void;
  onOrderToggleClick: () => void;
  onSongsReorder: (from: string, to: string) => void;
  handleFilterSelect: (songFilter: SongFilter) => void;
}

/** Пропсы кнопки фильтра */
export interface FilterChipProps {
  songFilter: SongFilter;
  count: number;
  isActive: boolean;
  onSelect: (songFilter: SongFilter) => void;
}

/** Пропсы кнопки режима порядка */
export interface OrderToggleProps {
  isOrdering: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}

/** Пропсы раздела ссылок проекта */
export interface LinksSectionProps {
  project: Project | undefined;
  isOrdering: boolean;
}

/** Пропсы полосы с прокруткой вбок */
export interface FadeScrollerProps {
  className?: string;
  children: ReactNode;
}

/** Результат хука полосы с прокруткой вбок */
export interface UseFadeScrollerResult {
  scrollerRef: RefObject<HTMLDivElement | null>;
  edges: ScrollEdges;
  handleEdgesMeasure: () => void;
}
