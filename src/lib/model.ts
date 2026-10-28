import type {
  CommentsResponse,
  FindingsResponse,
  IdeasResponse,
  LyricsResponse,
  SongStagesResponse,
  SongStagesStatusOptions,
  SongsResponse,
  SongsStatusOptions,
  StageTemplatesResponse,
  UsersResponse,
} from './pb-types';

// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
export type Substep = { title: string; done: boolean };

export type Song = SongsResponse;
export type SongStage = SongStagesResponse<Substep[]>;
export type StageTemplate = StageTemplatesResponse<string[]>;
export type Lyrics = LyricsResponse;
export type Idea = IdeasResponse<string[]>;
export type Finding = FindingsResponse<string[]>;
export type Comment = CommentsResponse<{ author?: UsersResponse }>;
export type User = UsersResponse;

export type StageStatus = SongStagesStatusOptions;
export type SongStatus = SongsStatusOptions;

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
