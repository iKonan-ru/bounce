import { Plus, Check, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProjectDirection } from '@/entities/project';
import { getProjectLinks } from '@/entities/service';
import type { Video } from '@/entities/video';
import { NewVideoDialog } from '@/features/create-video';
import { ProjectLinksBar } from '@/features/project-links';
import { GROUP_ROWS } from '@/shared/constants';
import {
  PageActions,
  Button,
  Loading,
  SortableList,
  EmptyState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { TABLE_COLUMNS, ORDER_PRESS_DELAY_MS } from '../constants/videos';
import { useVideosPage } from '../hooks/use-videos-page';
import { VideoRow } from './video-row';

/** Видео проекта */
export function VideosPage(): ReactNode {
  const {
    project,
    projectId,
    videos,
    visibleVideos,
    filter,
    filterCounts,
    onFilterSelect,
    isOrdering,
    canOrder,
    listRef,
    orderToggleRef,
    onOrderToggle,
    canEdit,
    isPending,
    isError,
    isEnabled,
    isCreating,
    onCreate,
    onClose,
    onReorder,
  } = useVideosPage();
  const renderRow = (video: Video): ReactNode => (
    <VideoRow video={video} isOrdering={isOrdering} projectId={projectId} />
  );

  const hasLinks =
    project && getProjectLinks(project, ProjectDirection.video).length > 0;

  return (
    <>
      <PageActions>
        {canEdit && isEnabled && (
          <Button
            className="max-sm:px-2.5"
            onClick={onCreate}
            disabled={isPending || isError}
          >
            <Plus data-icon="inline-start" />
            Новое видео
          </Button>
        )}
      </PageActions>
      {isPending && <Loading className="h-40 rounded-xl" />}
      {!isPending && isEnabled && videos.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {filterCounts.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isOrdering}
                  aria-pressed={filter === option.value}
                  onClick={() => onFilterSelect(option.value)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:opacity-40',
                    filter === option.value
                      ? 'bg-groove font-medium text-ink'
                      : 'text-dim hover:bg-groove/50 hover:text-ink'
                  )}
                >
                  {option.label}
                  <span className="text-xs text-dim tabular-nums">
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
            {canOrder && (
              <Button
                ref={orderToggleRef}
                size="sm"
                variant={isOrdering ? 'default' : 'ghost'}
                aria-pressed={isOrdering}
                aria-label={isOrdering ? 'Готово' : 'Порядок'}
                title={isOrdering ? 'Готово' : 'Порядок'}
                onClick={onOrderToggle}
                className="h-8 shrink-0 gap-1.5 max-sm:w-8 max-sm:px-0 sm:px-2.5"
              >
                {isOrdering ? <Check /> : <ArrowUpDown />}
                <span className="max-sm:hidden">
                  {isOrdering ? 'Готово' : 'Порядок'}
                </span>
              </Button>
            )}
          </div>
          {visibleVideos.length === 0 && (
            <EmptyState>Таких видео нет</EmptyState>
          )}
          <div
            aria-hidden="true"
            className={cn('hidden px-4 py-2 text-xs text-dim', TABLE_COLUMNS)}
          >
            <span>Видео</span>
            <span>Статус</span>
            <span>Прогресс</span>
          </div>
          <div ref={listRef}>
            {isOrdering ? (
              <SortableList
                items={visibleVideos}
                onReorder={onReorder}
                isWhole
                pressDelay={ORDER_PRESS_DELAY_MS}
                className={cn(
                  GROUP_ROWS,
                  'ring-2 ring-ring/40 dark:ring-ring/50'
                )}
              >
                {renderRow}
              </SortableList>
            ) : (
              <ul className={GROUP_ROWS}>
                {visibleVideos.map((video) => (
                  <li key={video.id}>{renderRow(video)}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {!isPending && !isError && isEnabled && videos.length === 0 && (
        <EmptyState
          action={
            canEdit && (
              <Button variant="secondary" onClick={onCreate}>
                <Plus data-icon="inline-start" />
                Новое видео
              </Button>
            )
          }
        >
          Видео пока нет
        </EmptyState>
      )}
      {isCreating && canEdit && isEnabled && (
        <NewVideoDialog projectId={projectId} onClose={onClose} />
      )}
      {!isPending && !isEnabled && (
        <p className="text-dim">Направление видео не включено.</p>
      )}
      {project && hasLinks && (
        <ProjectLinksBar
          project={project}
          direction={ProjectDirection.video}
          className="mt-auto pt-10"
        />
      )}
      {isError && <p className="text-led-red">Видео не загрузились.</p>}
    </>
  );
}
