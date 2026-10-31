import type { ReactNode } from 'react';
import {
  MenuSelect,
  PageHeader,
  ListFilters,
  Loading,
  EmptyState,
  Button,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { NoteComposer, NoteList } from '@/widgets/notes';
import { useNotesPage } from '../hooks/use-notes-page';
import { NoteFilters } from './note-filters';

/**
 * Заметки проекта: новая заметка - в сам проект
 *
 * Список - заметки проекта, песен и этапов вместе, с поиском, фильтрами и сортировкой
 */
export function NotesPage(): ReactNode {
  const {
    projectOptions,
    onProjectChange,
    crumbs,
    projectId,
    canWriteNotes,
    projectScope,
    filter,
    sort,
    setSort,
    songs,
    videos,
    directionOptions,
    levelOptions,
    onDirectionChange,
    onVideoChange,
    people,
    chips,
    notes,
    shownPending,
    total,
    isPending,
    isLoadFailed,
    isEmpty,
    isFiltered,
    isPlaceholder,
    hasNextPage,
    isFetchingNextPage,
    onSearchChange,
    onLevelChange,
    onSongChange,
    onAuthorChange,
    onImagesCheckedChange,
    onResetClick,
    onMoreClick,
  } = useNotesPage();

  const listClassName = cn('transition-opacity', {
    'opacity-60': isPlaceholder,
  });

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={crumbs} title="Заметки" />
      <div className="flex flex-col gap-6">
        <div className="md:hidden">
          <MenuSelect
            label="Проект"
            align="start"
            value={projectId}
            options={projectOptions}
            onChange={onProjectChange}
          />
        </div>
        {canWriteNotes && <NoteComposer key={projectId} scope={projectScope} />}

        <ListFilters
          searchId="notes-search"
          searchLabel="Поиск по заметкам"
          searchValue={filter.text}
          onSearchChange={onSearchChange}
          chips={chips}
          onReset={onResetClick}
        >
          <NoteFilters
            filter={filter}
            sort={sort}
            songs={songs}
            videos={videos}
            directionOptions={directionOptions}
            levelOptions={levelOptions}
            onDirectionChange={onDirectionChange}
            onVideoChange={onVideoChange}
            people={people}
            onLevelChange={onLevelChange}
            onSongChange={onSongChange}
            onAuthorChange={onAuthorChange}
            onImagesCheckedChange={onImagesCheckedChange}
            onSortChange={setSort}
          />
        </ListFilters>

        <div>
          {isPending && <Loading className="h-24 rounded-xl" />}
          {isLoadFailed && (
            <p className="text-led-red">Заметки не загрузились.</p>
          )}
          {isEmpty && (
            <EmptyState>
              {isFiltered ? 'Ничего не нашлось' : 'Заметок пока нет'}
            </EmptyState>
          )}
          {/* прежний результат, пока ищется новый, - чуть приглушён */}
          <div className={listClassName}>
            <NoteList
              projectId={projectId}
              notes={notes}
              pending={shownPending}
              showOrigin
            />
          </div>
          {hasNextPage && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={isFetchingNextPage}
                onClick={onMoreClick}
              >
                Показать ещё
              </Button>
              <span className="text-sm text-dim tabular-nums">
                {notes.length} из {total}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
