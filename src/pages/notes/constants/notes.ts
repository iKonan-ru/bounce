import type { PendingNote } from '@/entities/note';
import { NoteLevel, NoteSort } from '@/entities/note';
import type { ChoiceOption } from '../types/notes';

/** Варианты фильтра "Где" */
export const LEVEL_OPTIONS: readonly ChoiceOption<NoteLevel>[] = [
  { value: NoteLevel.All, label: 'Все' },
  { value: NoteLevel.Project, label: 'Проект' },
  { value: NoteLevel.Song, label: 'Песни' },
  { value: NoteLevel.Video, label: 'Видео' },
  { value: NoteLevel.Stage, label: 'Этапы' },
];

/** Подписи плашки фильтра "Где" */
export const LEVEL_LABEL: Record<NoteLevel, string> = {
  [NoteLevel.All]: 'Все',
  [NoteLevel.Project]: 'Только проекта',
  [NoteLevel.Song]: 'Только песен',
  [NoteLevel.Video]: 'Только видео',
  [NoteLevel.Stage]: 'Только этапов',
};

/** Варианты порядка заметок */
export const SORT_OPTIONS: readonly ChoiceOption<NoteSort>[] = [
  { value: NoteSort.Newest, label: 'Сначала новые' },
  { value: NoteSort.Oldest, label: 'Сначала старые' },
];

/** Пауза после последней набранной буквы до запроса поиска, мс */
export const SEARCH_DEBOUNCE_MS = 300;

/** Ждущие отправки заметки не показываются в результатах поиска и фильтров */
export const NO_PENDING: readonly PendingNote[] = [];
