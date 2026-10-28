import type {
  FindingsResponse,
  LyricsResponse,
  NotesKindOptions,
  NotesResponse,
  ProjectsResponse,
  SongStagesResponse,
  SongStagesStatusOptions,
  SongsResponse,
  SongsStatusOptions,
  StageTemplatesResponse,
  UsersResponse,
} from './pb-types';

// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
export type Substep = { title: string; done: boolean };

export type User = UsersResponse;
export type Project = ProjectsResponse<{ owner?: User; members?: User[] }>;
export type Song = SongsResponse;
export type SongStage = SongStagesResponse<Substep[]>;
export type StageTemplate = StageTemplatesResponse<string[]>;
export type Lyrics = LyricsResponse;
export type Note = NotesResponse<{ author?: User }>;
export type Finding = FindingsResponse<string[], { author?: User }>;

export type StageStatus = SongStagesStatusOptions;
export type SongStatus = SongsStatusOptions;
export type NoteKind = NotesKindOptions;

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  not_started: 'Не начат',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  skipped: 'Пропущен',
};

export const STAGE_STATUS_ORDER: StageStatus[] = [
  'not_started',
  'in_progress',
  'review',
  'done',
  'skipped',
];

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  active: 'В работе',
  paused: 'На паузе',
  done: 'Готова',
  released: 'Выпущена',
};

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  idea: 'Идея',
  comment: 'Комментарий',
};

// пределы файлов - те же, что в схеме PocketBase
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILES = 5;
export const MAX_IMAGE_FILES = 10;
