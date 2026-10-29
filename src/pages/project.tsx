import {
  ArrowUpDown,
  Check,
  ChevronRight,
  GripVertical,
  Plus,
} from 'lucide-react';
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ProjectAvatar, SongCover } from '@/components/images';
import { Loading } from '@/components/loading';
import { Meter } from '@/components/meter';
import { NewSongDialog } from '@/components/new-song-dialog';
import {
  type Crumb,
  EmptyState,
  GROUP_ROWS,
  PageHeader,
  type PageHeaderEdit,
  Section,
} from '@/components/page';
import { AvatarStack } from '@/components/people-picker';
import { ProjectLinksBar } from '@/components/project-links';
import { SortableList } from '@/components/sortable';
import { Button } from '@/components/ui/button';
import { useFieldUpload } from '@/hooks/use-field-upload';
import { type PendingImage } from '@/hooks/use-image-upload';
import { useAccess } from '@/lib/access';
import { getDateLabel } from '@/lib/format';
import {
  type FileRecord,
  getOrderedStages,
  type Project,
  type Song,
  type SongStage,
  SongStatus,
  type SongWithStages,
  type User,
} from '@/lib/model';
import { applyOptimisticEdit } from '@/lib/optimistic';
import { Collections, pb } from '@/lib/pb';
import { getCurrentStage, getSongProgress } from '@/lib/progress';
import { projectQuery, songsQuery } from '@/lib/queries';
import { QueryRoot, queryKeys } from '@/lib/query-keys';
import { getSongStatus } from '@/lib/release';
import { getProjectPeople } from '@/lib/roles';
import { getProjectLinks } from '@/lib/services';
import { moveItemById, savePositions } from '@/lib/stages';
import { SONG_STATUS_LABEL, SONG_STATUSES } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';

/** Фильтр списка песен без отбора по статусу */
enum FilterOption {
  /** Все песни */
  All = 'all',
}

/** Фильтр списка песен: все или один статус */
type SongFilter = SongStatus | FilterOption;

/** Id маршрута страницы проекта */
const PROJECT_ROUTE_ID = '/app/p/$projectId/';

/** Таблица - на широком экране; песня - вся свободная ширина, под названием - текущий этап */
const TABLE_COLUMNS =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_11rem_10rem_6rem] lg:gap-6';

/** Статусы песен, которые уже ушли из работы: отправлены на лейбл или выпущены */
const OUT_STATUSES: ReadonlySet<SongStatus> = new Set([
  SongStatus.sent,
  SongStatus.released,
]);

/** Фильтры списка песен по порядку */
const SONG_FILTERS: readonly SongFilter[] = [
  FilterOption.All,
  ...SONG_STATUSES,
];

/** Подписи фильтров списка песен */
const SONG_FILTER_LABEL: Record<SongFilter, string> = {
  [FilterOption.All]: 'Все',
  ...SONG_STATUS_LABEL,
};

/** Крошки страницы: к списку проектов */
const PROJECT_CRUMBS: Crumb[] = [
  { label: 'Проекты', link: { to: '/projects' } },
];

/** Поле картинки проекта */
const AVATAR_FIELD = 'avatar';

/** Размеры уменьшенных копий картинки проекта, которые готовятся заранее */
const AVATAR_THUMBS: readonly string[] = ['256x256'];

/** Сколько аватаров людей проекта видно в шапке */
const PEOPLE_SHOWN_MAX = 6;

/** Задержка нажатия перед перетаскиванием песни в режиме порядка */
const ORDER_PRESS_DELAY_MS = 150;

/** Клавиша, которая применяет порядок */
const ESCAPE_KEY = 'Escape';

/** Запас в пикселях, с которым край полосы считается достигнутым */
const EDGE_TOLERANCE_PX = 1;

/** Градиент над краем полосы, за которым есть ещё */
const FADE_CLASS_NAME =
  'pointer-events-none absolute inset-y-0 w-10 from-console to-transparent transition-opacity';

/** Фильтр со счётчиком песен */
interface FilterCount {
  songFilter: SongFilter;
  count: number;
}

/** Края полосы, за которыми есть ещё */
interface ScrollEdges {
  hasMoreLeft: boolean;
  hasMoreRight: boolean;
}

/** Ничего не скрыто ни с одного края */
const NO_SCROLL_EDGES: ScrollEdges = {
  hasMoreLeft: false,
  hasMoreRight: false,
};

/** Пропсы строки песни */
interface SongRowProps {
  song: SongWithStages;
  projectId: string;
  /** Режим порядка: строку тянут, она не ссылка */
  isOrdering?: boolean;
}

/** Пропсы содержимого строки песни */
interface SongRowContentProps {
  song: SongWithStages;
  isOrdering: boolean;
}

/** Пропсы прогресса песни */
interface SongProgressProps {
  stages: SongStage[];
  /** Дата релиза; пусто - не назначена */
  releaseLabel: string;
}

/** Результат хука страницы проекта */
interface UseProjectPageResult {
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
interface FilterChipProps {
  songFilter: SongFilter;
  count: number;
  isActive: boolean;
  onSelect: (songFilter: SongFilter) => void;
}

/** Пропсы кнопки режима порядка */
interface OrderToggleProps {
  isOrdering: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}

/** Пропсы раздела ссылок проекта */
interface LinksSectionProps {
  project: Project | undefined;
  isOrdering: boolean;
}

/** Пропсы полосы с прокруткой вбок */
interface FadeScrollerProps {
  className?: string;
  children: ReactNode;
}

/** Результат хука полосы с прокруткой вбок */
interface UseFadeScrollerResult {
  scrollerRef: RefObject<HTMLDivElement | null>;
  edges: ScrollEdges;
  handleEdgesMeasure: () => void;
}

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

/** Подпись даты релиза; не назначена - пустая строка */
function getReleaseLabel(song: Song): string {
  if (!song.target_release) {
    return '';
  }

  return getDateLabel(song.target_release);
}

/** Люди проекта; проект ещё не загружен - никого */
function getPeopleUsers(project: Project | undefined): User[] {
  if (!project) {
    return [];
  }

  return getProjectPeople(project).map((person) => person.user);
}

/**
 * Прогресс песни: на телефоне и планшете - дата релиза над прогрессом; на компьютере дата -
 * колонкой
 */
function SongProgress({ stages, releaseLabel }: SongProgressProps): ReactNode {
  const hasRelease = releaseLabel !== '';
  const hasStages = stages.length > 0;

  if (!hasStages) {
    const noStagesClassName = cn({ 'max-lg:hidden': hasRelease });

    return (
      <span className="text-xs text-dim">
        {hasRelease && <span className="lg:hidden">{releaseLabel}</span>}
        <span className={noStagesClassName}>Нет этапов</span>
      </span>
    );
  }

  const progress = getSongProgress(stages);

  return (
    <>
      <span className="text-xs text-dim tabular-nums lg:order-2 lg:w-8 lg:text-right">
        {hasRelease && <span className="lg:hidden">{releaseLabel} · </span>}
        {progress.done}/{progress.total}
      </span>
      <span className="w-24 lg:order-1 lg:w-auto lg:flex-1">
        <Meter stages={stages} />
      </span>
    </>
  );
}

/** Содержимое строки песни: обложка, название, статус, текущий этап, прогресс и дата релиза */
function SongRowContent({ song, isOrdering }: SongRowContentProps): ReactNode {
  const stages = getOrderedStages(song);
  const currentStage = getCurrentStage(stages);
  const releaseLabel = getReleaseLabel(song);
  const statusLabel = SONG_STATUS_LABEL[getSongStatus(song)];
  const mobileSubtitle = [statusLabel, currentStage?.title]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {isOrdering && (
          <GripVertical className="-mr-1 -ml-1 size-4 shrink-0 text-dim animate-in fade-in-0 zoom-in-75" />
        )}
        <SongCover song={song} className="size-11 lg:size-10" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{song.title}</span>
          <span className="block truncate text-sm text-dim lg:hidden">
            {mobileSubtitle}
          </span>
          {currentStage && (
            <span className="hidden truncate text-sm text-dim lg:block">
              {currentStage.title}
            </span>
          )}
        </span>
      </span>
      <span className="hidden truncate text-sm text-dim lg:block">
        {statusLabel}
      </span>
      {/* справа: на телефоне и планшете - дата релиза над прогрессом; на компьютере дата - колонкой */}
      <span className="flex shrink-0 flex-col items-end gap-1 lg:w-auto lg:flex-row lg:items-center lg:gap-2">
        <SongProgress stages={stages} releaseLabel={releaseLabel} />
      </span>
      <span className="hidden text-sm text-dim lg:block">{releaseLabel}</span>
      {!isOrdering && (
        <ChevronRight className="size-4 shrink-0 text-dim/60 lg:hidden" />
      )}
    </>
  );
}

/**
 * Строка песни
 *
 * В режиме порядка строка - не ссылка: её тянут за любое место, слева - значок захвата
 */
function SongRow({
  song,
  projectId,
  isOrdering = false,
}: SongRowProps): ReactNode {
  const rowClassName = cn(
    'flex min-w-0 items-center gap-3 px-4 py-3 transition-colors lg:py-2.5',
    TABLE_COLUMNS
  );
  const content = <SongRowContent song={song} isOrdering={isOrdering} />;

  if (isOrdering) {
    const orderingClassName = cn(
      rowClassName,
      'cursor-grab hover:bg-groove/40 active:cursor-grabbing'
    );

    return <div className={orderingClassName}>{content}</div>;
  }

  const linkClassName = cn(
    rowClassName,
    'hover:bg-groove/40 active:bg-groove/70'
  );
  const linkParams = { projectId, songId: song.id };

  return (
    <Link
      to="/p/$projectId/songs/$songId"
      params={linkParams}
      draggable={false}
      className={linkClassName}
    >
      {content}
    </Link>
  );
}

/** Песни проекта, фильтр по статусу и режим ручного порядка */
function useProjectPage(): UseProjectPageResult {
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

/** Страница проекта: песни в работе, отправленные и выпущенные, ссылки проекта */
export function ProjectPage(): ReactNode {
  const {
    projectId,
    project,
    songs,
    canEdit,
    onAvatarPick,
    pendingAvatar,
    headerEdit,
    people,
    hasPeople,
    hasSongs,
    hasNoSongs,
    hasLoadError,
    filter,
    filterCounts,
    isCreating,
    setIsCreating,
    isOrdering,
    canOrder,
    isFilteredEmpty,
    mainSongs,
    outSongs,
    listRef,
    orderToggleRef,
    onNewSongClick,
    onOrderToggleClick,
    onSongsReorder,
    handleFilterSelect,
  } = useProjectPage();

  const headerMedia = project && (
    <ProjectAvatar
      project={project}
      isInteractive
      onPick={onAvatarPick}
      pending={pendingAvatar}
      className="size-12 rounded-xl text-lg"
    />
  );
  const headerTitle = project?.name ?? '';
  const headerMeta = hasPeople && (
    <AvatarStack
      users={people}
      maxCount={PEOPLE_SHOWN_MAX}
      ringClassName="ring-console"
      className="mt-1"
    />
  );
  const headerActions = canEdit && (
    <>
      <Button
        size="icon"
        aria-label="Новая песня"
        className="sm:hidden"
        onClick={onNewSongClick}
      >
        <Plus className="size-5" />
      </Button>
      <Button className="max-sm:hidden" onClick={onNewSongClick}>
        <Plus data-icon="inline-start" />
        Новая песня
      </Button>
    </>
  );
  const emptyAction = canEdit && (
    <Button variant="secondary" onClick={onNewSongClick}>
      <Plus data-icon="inline-start" />
      Новая песня
    </Button>
  );
  const filtersClassName = cn('transition-opacity', {
    'pointer-events-none opacity-40': isOrdering,
  });
  const tableHeadClassName = cn(
    'hidden px-4 py-2 text-xs text-dim',
    TABLE_COLUMNS
  );
  const sortableClassName = cn(
    GROUP_ROWS,
    'ring-2 ring-ring/40 dark:ring-ring/50'
  );
  const outSectionClassName = cn('mt-8 transition-opacity', {
    'pointer-events-none opacity-40': isOrdering,
  });
  const hasMainSongs = mainSongs.length > 0;
  const hasOutSongs = outSongs.length > 0;

  const renderOrderingRow = (song: SongWithStages): ReactNode => (
    <SongRow song={song} projectId={projectId} isOrdering />
  );

  return (
    <>
      <PageHeader
        crumbs={PROJECT_CRUMBS}
        media={headerMedia}
        title={headerTitle}
        edit={headerEdit}
        meta={headerMeta}
        actions={headerActions}
      />

      {songs.isPending && <Loading className="h-40 rounded-xl" />}
      {hasLoadError && <p className="text-led-red">Песни не загрузились.</p>}
      {hasNoSongs && (
        <EmptyState action={emptyAction}>Песен пока нет</EmptyState>
      )}

      {hasSongs && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <FadeScroller className={filtersClassName}>
              {filterCounts.map((filterCount) => {
                const isActive = filter === filterCount.songFilter;

                return (
                  <FilterChip
                    key={filterCount.songFilter}
                    songFilter={filterCount.songFilter}
                    count={filterCount.count}
                    isActive={isActive}
                    onSelect={handleFilterSelect}
                  />
                );
              })}
            </FadeScroller>
            {canOrder && (
              <OrderToggle
                isOrdering={isOrdering}
                toggleRef={orderToggleRef}
                onClick={onOrderToggleClick}
              />
            )}
          </div>

          {isFilteredEmpty && <EmptyState>Таких песен нет</EmptyState>}
          <div aria-hidden="true" className={tableHeadClassName}>
            <span>Песня</span>
            <span>Статус</span>
            <span>Прогресс</span>
            <span>Релиз</span>
          </div>
          {hasMainSongs && (
            <div ref={listRef}>
              {isOrdering ? (
                <SortableList
                  items={mainSongs}
                  onReorder={onSongsReorder}
                  className={sortableClassName}
                  isWhole
                  pressDelay={ORDER_PRESS_DELAY_MS}
                >
                  {renderOrderingRow}
                </SortableList>
              ) : (
                <ul className={GROUP_ROWS}>
                  {mainSongs.map((song) => (
                    <li key={song.id}>
                      <SongRow song={song} projectId={projectId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {hasOutSongs && (
            <Section
              title="Отправлены на лейбл и выпущены"
              className={outSectionClassName}
            >
              <ul className={GROUP_ROWS}>
                {outSongs.map((song) => (
                  <li key={song.id}>
                    <SongRow song={song} projectId={projectId} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
      <LinksSection project={project} isOrdering={isOrdering} />
      <NewSongDialog
        projectId={projectId}
        open={isCreating}
        onOpenChange={setIsCreating}
      />
    </>
  );
}

/** Кнопка фильтра по статусу со счётчиком песен */
function FilterChip({
  songFilter,
  count,
  isActive,
  onSelect,
}: FilterChipProps): ReactNode {
  const chipClassName = cn(
    'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
    {
      'bg-groove font-medium text-ink': isActive,
      'text-dim hover:bg-groove/50 hover:text-ink': !isActive,
    }
  );
  const onChipClick = (): void => {
    onSelect(songFilter);
  };

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onChipClick}
      className={chipClassName}
    >
      {SONG_FILTER_LABEL[songFilter]}
      <span className="text-xs text-dim tabular-nums">{count}</span>
    </button>
  );
}

/** Кнопка режима порядка: "Порядок" включает его, "Готово" - применяет */
function OrderToggle({
  isOrdering,
  toggleRef,
  onClick,
}: OrderToggleProps): ReactNode {
  const orderLabel = isOrdering ? 'Готово' : 'Порядок';
  const orderVariant = isOrdering ? 'default' : 'ghost';
  // на телефоне - только значок: место в строке остаётся статусам
  const toggleClassName = cn(
    'h-8 shrink-0 gap-1.5 max-sm:w-8 max-sm:px-0 sm:px-2.5',
    {
      'text-dim': !isOrdering,
    }
  );

  return (
    <Button
      ref={toggleRef}
      size="sm"
      variant={orderVariant}
      aria-pressed={isOrdering}
      aria-label={orderLabel}
      title={orderLabel}
      className={toggleClassName}
      onClick={onClick}
    >
      {isOrdering ? <Check /> : <ArrowUpDown />}
      <span className="max-sm:hidden">{orderLabel}</span>
    </Button>
  );
}

/** Ссылки проекта; прижаты к низу страницы: короткий список песен их не поднимает */
function LinksSection({ project, isOrdering }: LinksSectionProps): ReactNode {
  const sectionClassName = cn('mt-auto pt-10 transition-opacity', {
    'pointer-events-none opacity-40': isOrdering,
  });

  if (!project) {
    return null;
  }

  const hasLinks = getProjectLinks(project).length > 0;

  if (!hasLinks) {
    return null;
  }

  return (
    <Section title="Ссылки" className={sectionClassName}>
      <ProjectLinksBar project={project} />
    </Section>
  );
}

/** Края полосы с прокруткой вбок: какие из них уходят под градиент */
function useFadeScroller(): UseFadeScrollerResult {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>(NO_SCROLL_EDGES);

  // useCallback: функция - зависимость эффекта с ResizeObserver; без стабильной ссылки
  // наблюдатель пересоздавался бы при каждой отрисовке
  const handleEdgesMeasure = useCallback((): void => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const hasMoreLeft = scroller.scrollLeft > EDGE_TOLERANCE_PX;
    const visibleEnd = scroller.scrollLeft + scroller.clientWidth;
    const hasMoreRight = visibleEnd < scroller.scrollWidth - EDGE_TOLERANCE_PX;
    setEdges((current: ScrollEdges): ScrollEdges => {
      const isSameLeft = current.hasMoreLeft === hasMoreLeft;
      const isSameRight = current.hasMoreRight === hasMoreRight;
      const isSame = isSameLeft && isSameRight;

      if (isSame) {
        return current;
      }

      return { hasMoreLeft, hasMoreRight };
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    handleEdgesMeasure();
    const resizeObserver = new ResizeObserver(handleEdgesMeasure);
    resizeObserver.observe(scroller);
    for (const child of Array.from(scroller.children)) {
      resizeObserver.observe(child);
    }

    return (): void => {
      resizeObserver.disconnect();
    };
  }, [handleEdgesMeasure]);

  return { scrollerRef, edges, handleEdgesMeasure };
}

/**
 * Полоса, которая прокручивается вбок
 *
 * Край, за которым есть ещё, уходит под градиент цвета страницы
 */
function FadeScroller({ className, children }: FadeScrollerProps): ReactNode {
  const { scrollerRef, edges, handleEdgesMeasure } = useFadeScroller();
  const wrapperClassName = cn(
    'relative -ml-4 min-w-0 flex-1 md:ml-0',
    className
  );
  const leftFadeClassName = cn(FADE_CLASS_NAME, 'left-0 bg-linear-to-r', {
    'opacity-0': !edges.hasMoreLeft,
  });
  const rightFadeClassName = cn(FADE_CLASS_NAME, 'right-0 bg-linear-to-l', {
    'opacity-0': !edges.hasMoreRight,
  });

  return (
    <div className={wrapperClassName}>
      <div
        ref={scrollerRef}
        onScroll={handleEdgesMeasure}
        className="flex gap-1 overflow-x-auto pl-4 md:pl-0 [scrollbar-width:none]"
      >
        {children}
      </div>
      <div aria-hidden="true" className={leftFadeClassName} />
      <div aria-hidden="true" className={rightFadeClassName} />
    </div>
  );
}
