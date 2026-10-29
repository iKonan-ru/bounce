import { Plus, Check, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectAvatar, AvatarStack } from '@/entities/project';
import { getProjectLinks } from '@/entities/service';
import type { SongWithStages } from '@/entities/song';
import { NewSongDialog } from '@/features/create-song';
import { ProjectLinksBar } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Button,
  PageHeader,
  Loading,
  EmptyState,
  SortableList,
  Section,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import {
  TABLE_COLUMNS,
  PEOPLE_SHOWN_MAX,
  PROJECT_CRUMBS,
  ORDER_PRESS_DELAY_MS,
  SONG_FILTER_LABEL,
  FADE_CLASS_NAME,
} from '../constants/project';
import { useFadeScroller } from '../hooks/use-fade-scroller';
import { useProjectPage } from '../hooks/use-project-page';
import type {
  SongRowProps,
  FilterChipProps,
  OrderToggleProps,
  LinksSectionProps,
  FadeScrollerProps,
} from '../types/project';
import { SongRowContent } from './song-row-content';

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
