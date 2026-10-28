import type {
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
export type Substep = { id: string; title: string; done: boolean };
export type TemplateSubstep = { id: string; title: string };

export type User = UsersResponse;
export type Project = ProjectsResponse<{ owner?: User; members?: User[] }>;
export type Song = SongsResponse;
export type SongStage = SongStagesResponse<Substep[]>;
export type StageTemplate = StageTemplatesResponse<TemplateSubstep[]>;
export type Note = NotesResponse<{ author?: User; song?: Song; stage?: SongStage }>;

export type StageStatus = SongStagesStatusOptions;
export type SongStatus = SongsStatusOptions;

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  not_started: 'Не начат',
  in_progress: 'В работе',
  done: 'Готово',
  skipped: 'Пропущен',
};

export const STAGE_STATUSES: StageStatus[] = ['not_started', 'in_progress', 'done', 'skipped'];

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  active: 'В работе',
  paused: 'На паузе',
  done: 'Готова',
  released: 'Выпущена',
};

export const SONG_STATUSES: SongStatus[] = ['active', 'paused', 'done', 'released'];

// пределы файлов - те же, что в схеме PocketBase
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILES = 5;
export const MAX_IMAGE_FILES = 10;
export const MAX_COVERS = 30;

// основная обложка песни: выбранная, иначе первая
export function mainCover(song: {
  covers?: ReadonlyArray<string> | undefined;
  main_cover?: string | undefined;
}): string | undefined {
  const covers = song.covers ?? [];
  return covers.find((c) => c === song.main_cover) ?? covers[0];
}
