import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import { NewSongDialog } from '@/features/create-song';
import { GROUP_ROWS } from '@/shared/constants';
import {
  PageActions,
  Button,
  Loading,
  EmptyState,
  SortableList,
  Section,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { Navigate } from '@tanstack/react-router';
import {
  TABLE_COLUMNS,
  BASIC_TABLE_COLUMNS,
  ORDER_PRESS_DELAY_MS,
} from '../constants/project';
import { useProjectPage } from '../hooks/use-project-page';
import { FadeScroller } from './fade-scroller';
import { FilterChip } from './filter-chip';
import { LinksSection } from './links-section';
import { OrderToggle } from './order-toggle';
import { SongRow } from './song-row';

/** Страница проекта: песни в работе, отправленные и выпущенные, ссылки проекта */
export function ProjectPage(): ReactNode {
  const {
    projectId,
    project,
    songs,
    canEdit,
    isReleaseEnabled,
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

  const headerActions = canEdit && (
    <Button className="max-sm:px-2.5" onClick={onNewSongClick}>
      <Plus data-icon="inline-start" />
      Новая песня
    </Button>
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
  const tableColumns = isReleaseEnabled ? TABLE_COLUMNS : BASIC_TABLE_COLUMNS;
  const tableHeadClassName = cn(
    'hidden px-4 py-2 text-xs text-dim',
    tableColumns
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
    <SongRow
      song={song}
      projectId={projectId}
      isReleaseEnabled={isReleaseEnabled}
      isOrdering
    />
  );

  if (project && !project.directions.includes(ProjectDirection.music)) {
    return (
      <Navigate to="/p/$projectId/videos" params={{ projectId }} replace />
    );
  }

  return (
    <>
      <PageActions>{headerActions}</PageActions>
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
            {isReleaseEnabled && <span>Релиз</span>}
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
                      <SongRow
                        song={song}
                        projectId={projectId}
                        isReleaseEnabled={isReleaseEnabled}
                      />
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
                    <SongRow
                      song={song}
                      projectId={projectId}
                      isReleaseEnabled={isReleaseEnabled}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
      {isReleaseEnabled && (
        <LinksSection project={project} isOrdering={isOrdering} />
      )}
      {isCreating && canEdit && (
        <NewSongDialog
          projectId={projectId}
          open
          onOpenChange={setIsCreating}
        />
      )}
    </>
  );
}
