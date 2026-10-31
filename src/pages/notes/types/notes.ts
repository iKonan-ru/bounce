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
import type { Video } from '@/entities/video';
import type {
  FilterChip,
  ContentDirection,
  MenuOption,
  Crumb,
  NoteScope,
} from '@/shared/types';

/** Вариант переключателя */
export interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Пропсы окна фильтров */
export interface NoteFiltersProps {
  filter: NotesFilter;
  sort: NoteSort;
  songs: SongWithStages[] | undefined;
  videos: Video[] | undefined;
  directionOptions: MenuOption<ContentDirection>[];
  levelOptions: MenuOption<NoteLevel>[];
  onDirectionChange: (value: ContentDirection) => void;
  onVideoChange: (value: string) => void;
  people: User[];
  onLevelChange: (level: NoteLevel) => void;
  onSongChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onImagesCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onSortChange: (sort: NoteSort) => void;
}

/** Состояние раздела "Все заметки" */
export interface UseNotesPageResult {
  projectOptions: MenuOption<string>[];
  onProjectChange: (projectId: string) => void;
  crumbs: Crumb[];
  projectId: string;
  canWriteNotes: boolean;
  /** Уровень проекта: туда пишется новая заметка */
  projectScope: NoteScope;
  filter: NotesFilter;
  sort: NoteSort;
  setSort: (sort: NoteSort) => void;
  songs: SongWithStages[] | undefined;
  videos: Video[] | undefined;
  directionOptions: MenuOption<ContentDirection>[];
  levelOptions: MenuOption<NoteLevel>[];
  onDirectionChange: (value: ContentDirection) => void;
  onVideoChange: (value: string) => void;
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
  onSongChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onImagesCheckedChange: (checked: CheckboxPrimitive.CheckedState) => void;
  onResetClick: () => void;
  onMoreClick: () => void;
}
