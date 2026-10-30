import { NoteVisibility } from '../types/visibility';
import type { NoteSharing } from '../types/visibility';

/** Без отдельного выбора новая заметка видна участникам проекта */
export const DEFAULT_NOTE_SHARING: NoteSharing = {
  visibility: NoteVisibility.project,
  recipients: [],
};

/** Короткие подписи управления видимостью */
export const NOTE_VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  [NoteVisibility.project]: 'Всем',
  [NoteVisibility.private]: 'Только мне',
  [NoteVisibility.selected]: 'Выбранным',
};
