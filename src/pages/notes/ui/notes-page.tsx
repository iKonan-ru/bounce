import { X, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader, Input, Loading, EmptyState, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { NoteComposer, NoteList } from '@/widgets/notes';
import { CHIP_CLASS_NAME } from '../constants/notes';
import { useNotesPage } from '../hooks/use-notes-page';
import type { FilterChipButtonProps } from '../types/notes';
import { FiltersPopover } from './filters-popover';

/** Плашка фильтра: нажатие снимает фильтр */
function FilterChipButton({ chip }: FilterChipButtonProps): ReactNode {
  return (
    <button type="button" onClick={chip.onClear} className={CHIP_CLASS_NAME}>
      {chip.label}
      <X className="size-3.5 text-dim" aria-label="убрать" />
    </button>
  );
}

/**
 * Заметки проекта: новая заметка - в сам проект
 *
 * Список - заметки проекта, песен и этапов вместе, с поиском, фильтрами и сортировкой
 */
export function NotesPage(): ReactNode {
  const {
    projectId,
    crumbs,
    canWork,
    projectScope,
    filter,
    sort,
    setSort,
    songs,
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

  const hasChips = chips.length > 0;
  const listClassName = cn('transition-opacity', {
    'opacity-60': isPlaceholder,
  });

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={crumbs} title="Заметки" />
      <div className="flex flex-col gap-6">
        {canWork && <NoteComposer scope={projectScope} />}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
              <label htmlFor="notes-search" className="sr-only">
                Поиск по заметкам
              </label>
              <Input
                id="notes-search"
                type="search"
                placeholder="Поиск"
                value={filter.text}
                onChange={onSearchChange}
                className="h-10 pl-9 md:h-9"
              />
            </div>
            <FiltersPopover
              filter={filter}
              sort={sort}
              songs={songs}
              people={people}
              chipsCount={chips.length}
              onLevelChange={onLevelChange}
              onSongChange={onSongChange}
              onAuthorChange={onAuthorChange}
              onImagesCheckedChange={onImagesCheckedChange}
              onSortChange={setSort}
              onResetClick={onResetClick}
            />
          </div>
          {hasChips && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <FilterChipButton key={chip.label} chip={chip} />
              ))}
            </div>
          )}
        </div>

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
