import type { PendingNote } from '@/entities/note';
import { NoteLevel, NoteSort } from '@/entities/note';
import { cn } from '@/shared/utils';
import type { ChoiceOption } from '../types/notes';

/** Варианты фильтра "Где" */
export const LEVEL_OPTIONS: readonly ChoiceOption<NoteLevel>[] = [
  { value: NoteLevel.All, label: 'Все' },
  { value: NoteLevel.Project, label: 'Проект' },
  { value: NoteLevel.Song, label: 'Песни' },
  { value: NoteLevel.Stage, label: 'Этапы' },
];

/** Подписи плашки фильтра "Где" */
export const LEVEL_LABEL: Record<NoteLevel, string> = {
  [NoteLevel.All]: 'Все',
  [NoteLevel.Project]: 'Только проекта',
  [NoteLevel.Song]: 'Только песен',
  [NoteLevel.Stage]: 'Только этапов',
};

/** Варианты порядка заметок */
export const SORT_OPTIONS: readonly ChoiceOption<NoteSort>[] = [
  { value: NoteSort.Newest, label: 'Сначала новые' },
  { value: NoteSort.Oldest, label: 'Сначала старые' },
];

/** Выпадающий список фильтра */
export const SELECT_CLASS_NAME =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30 md:h-9';

/** Плашка снятия фильтра */
export const CHIP_CLASS_NAME = cn(
  'flex h-8 items-center gap-1 rounded-lg bg-groove px-2.5 text-sm transition-colors hover:bg-groove/70'
);

/** Пауза после последней набранной буквы до запроса поиска, мс */
export const SEARCH_DEBOUNCE_MS = 300;

/** Ждущие отправки заметки не показываются в результатах поиска и фильтров */
export const NO_PENDING: readonly PendingNote[] = [];
