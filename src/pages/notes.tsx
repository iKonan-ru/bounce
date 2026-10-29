import { X, SlidersHorizontal, Search } from 'lucide-react';
import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode, ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { useProjectCrumbs } from '@/components/crumbs';
import { NoteComposer } from '@/components/notes/note-composer';
import { NoteList } from '@/components/notes/notes-feed';
import type { PendingNote, NotesFilter, Note } from '@/entities/note';
import {
  NoteLevel,
  NoteSort,
  usePendingNotes,
  EMPTY_NOTES_FILTER,
  getNotesFilter,
  allNotesQuery,
} from '@/entities/note';
import { useProjectPeople, useAccess } from '@/entities/project';
import type { SongWithStages } from '@/entities/song';
import { songsQuery } from '@/entities/song';
import type { User } from '@/entities/user';
import { pb } from '@/shared/api';
import type { Crumb, NoteScope } from '@/shared/types';
import {
  Popover,
  PopoverTrigger,
  Button,
  PopoverContent,
  Segmented,
  Checkbox,
  PageHeader,
  Input,
  Loading,
  EmptyState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Вариант переключателя */
interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Снятый одной кнопкой фильтр: плашка под поиском */
interface FilterChip {
  label: string;
  onClear: () => void;
}

/** Варианты фильтра "Где" */
const LEVEL_OPTIONS: readonly ChoiceOption<NoteLevel>[] = [
  { value: NoteLevel.All, label: 'Все' },
  { value: NoteLevel.Project, label: 'Проект' },
  { value: NoteLevel.Song, label: 'Песни' },
  { value: NoteLevel.Stage, label: 'Этапы' },
];

/** Подписи плашки фильтра "Где" */
const LEVEL_LABEL: Record<NoteLevel, string> = {
  [NoteLevel.All]: 'Все',
  [NoteLevel.Project]: 'Только проекта',
  [NoteLevel.Song]: 'Только песен',
  [NoteLevel.Stage]: 'Только этапов',
};

/** Варианты порядка заметок */
const SORT_OPTIONS: readonly ChoiceOption<NoteSort>[] = [
  { value: NoteSort.Newest, label: 'Сначала новые' },
  { value: NoteSort.Oldest, label: 'Сначала старые' },
];

/** Выпадающий список фильтра */
const SELECT_CLASS_NAME =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30 md:h-9';

/** Плашка снятия фильтра */
const CHIP_CLASS_NAME = cn(
  'flex h-8 items-center gap-1 rounded-lg bg-groove px-2.5 text-sm transition-colors hover:bg-groove/70'
);

/** Пауза после последней набранной буквы до запроса поиска, мс */
const SEARCH_DEBOUNCE_MS = 300;

/** Ждущие отправки заметки не показываются в результатах поиска и фильтров */
const NO_PENDING: readonly PendingNote[] = [];

/** Значение, которое догоняет исходное через delayMs после последнего изменения */
function useDebounced<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return settled;
}

/** Пропсы плашки фильтра */
interface FilterChipButtonProps {
  chip: FilterChip;
}

/** Плашка фильтра: нажатие снимает фильтр */
function FilterChipButton({ chip }: FilterChipButtonProps): ReactNode {
  return (
    <button type="button" onClick={chip.onClear} className={CHIP_CLASS_NAME}>
      {chip.label}
      <X className="size-3.5 text-dim" aria-label="убрать" />
    </button>
  );
}

/** Пропсы окна фильтров */
interface FiltersPopoverProps {
  filter: NotesFilter;
  sort: NoteSort;
  songs: SongWithStages[] | undefined;
  people: User[];
  /** Сколько фильтров включено: число на кнопке и кнопка сброса */
  chipsCount: number;
  onLevelChange: (level: NoteLevel) => void;
  onSongChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onAuthorChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onImagesCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onSortChange: (sort: NoteSort) => void;
  onResetClick: () => void;
}

/** Кнопка "Фильтры" и окно с ними: где, песня, автор, картинки и порядок */
function FiltersPopover({
  filter,
  sort,
  songs,
  people,
  chipsCount,
  onLevelChange,
  onSongChange,
  onAuthorChange,
  onImagesCheckedChange,
  onSortChange,
  onResetClick,
}: FiltersPopoverProps): ReactNode {
  const hasChips = chipsCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 md:h-9">
          <SlidersHorizontal className="size-4" />
          <span className="max-sm:sr-only">Фильтры</span>
          {hasChips && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {chipsCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-dim">Где</span>
          <Segmented
            label="Где"
            options={LEVEL_OPTIONS}
            value={filter.level}
            onChange={onLevelChange}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-song" className="text-sm text-dim">
            Песня
          </label>
          <select
            id="filter-song"
            value={filter.song}
            onChange={onSongChange}
            className={SELECT_CLASS_NAME}
          >
            <option value="">Любая</option>
            {songs?.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-author" className="text-sm text-dim">
            Автор
          </label>
          <select
            id="filter-author"
            value={filter.author}
            onChange={onAuthorChange}
            className={SELECT_CLASS_NAME}
          >
            <option value="">Любой</option>
            {people.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <label
          htmlFor="filter-images"
          className="flex min-h-9 cursor-pointer items-center gap-3"
        >
          <Checkbox
            id="filter-images"
            className="size-5"
            checked={filter.hasImages}
            onCheckedChange={onImagesCheckedChange}
          />
          Только с картинками
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-dim">Порядок</span>
          <Segmented
            label="Порядок"
            options={SORT_OPTIONS}
            value={sort}
            onChange={onSortChange}
          />
        </div>
        {hasChips && (
          <Button
            variant="ghost"
            className="self-start text-dim"
            onClick={onResetClick}
          >
            Сбросить фильтры
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Состояние раздела "Все заметки" */
interface UseNotesPageResult {
  projectId: string;
  crumbs: Crumb[];
  canWork: boolean;
  /** Уровень проекта: туда пишется новая заметка */
  projectScope: NoteScope;
  filter: NotesFilter;
  sort: NoteSort;
  setSort: (sort: NoteSort) => void;
  songs: SongWithStages[] | undefined;
  people: User[];
  chips: FilterChip[];
  notes: Note[];
  /** Ждущие отправки заметки проекта, которые видны в списке */
  shownPending: readonly PendingNote[];
  total: number;
  isPending: boolean;
  isLoadFailed: boolean;
  isEmpty: boolean;
  isFiltered: boolean;
  /** Показан прежний результат, пока ищется новый */
  isPlaceholder: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLevelChange: (level: NoteLevel) => void;
  onSongChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onAuthorChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onImagesCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onResetClick: () => void;
  onMoreClick: () => void;
}

/** Заметки проекта с поиском, фильтрами и сортировкой */
function useNotesPage(): UseNotesPageResult {
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
