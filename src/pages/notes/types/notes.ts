import type { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ChangeEvent } from 'react';
import type {
  NotesFilter,
  Note,
  PendingNote,
  NoteSort,
  NoteLevel,
} from '@/entities/note';
import type { SongWithStages } from '@/entities/song';
import type { User } from '@/entities/user';
import type { Crumb, NoteScope } from '@/shared/types';

/** Вариант переключателя */
export interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Снятый одной кнопкой фильтр: плашка под поиском */
export interface FilterChip {
  label: string;
  onClear: () => void;
}

/** Пропсы плашки фильтра */
export interface FilterChipButtonProps {
  chip: FilterChip;
}

/** Пропсы окна фильтров */
export interface FiltersPopoverProps {
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

/** Состояние раздела "Все заметки" */
export interface UseNotesPageResult {
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
