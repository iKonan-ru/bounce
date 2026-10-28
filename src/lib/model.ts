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
  sent: 'Отправлена на лейбл',
  released: 'Выпущена',
};

export const SONG_STATUSES: SongStatus[] = ['active', 'paused', 'done', 'sent', 'released'];
// статусы, которые выбирают руками; "отправлена" - через раздел "Релиз", "выпущена" - сама
export const MANUAL_SONG_STATUSES: SongStatus[] = ['active', 'paused', 'done'];

// день релиза наступил (по местному времени); дата хранится полднем UTC
export function releaseDue(iso: string | undefined, now = new Date()): boolean {
  const day = (iso ?? '').slice(0, 10);
  if (!day) return false;
  const p = (n: number) => String(n).padStart(2, '0');
  return day <= `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// статус для показа: сервер переводит отправленную песню в выпущенные раз в час, а здесь это
// видно сразу в день релиза
export function songStatus(song: Pick<Song, 'status' | 'target_release'>): SongStatus {
  return song.status === 'sent' && releaseDue(song.target_release) ? 'released' : song.status;
}

// чего не хватает для отправки на лейбл (так же проверяет сервер, pb_hooks/lib/release.js)
export function releaseMissing(song: {
  lyrics?: string | undefined;
  release_cover?: string | undefined;
}): string[] {
  const missing: string[] = [];
  if (!(song.lyrics ?? '').trim()) missing.push('текст песни');
  if (!song.release_cover) missing.push('обложка для релиза');
  return missing;
}

export const RELEASE_COVER_SIZE = 3000;

// пределы файлов - те же, что в схеме PocketBase
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILES = 5;
export const MAX_IMAGE_FILES = 10;
export const MAX_COVERS = 30;

// основная обложка песни: выбранная, иначе первая, иначе обложка для релиза
export function mainCover(song: {
  covers?: ReadonlyArray<string> | undefined;
  main_cover?: string | undefined;
  release_cover?: string | undefined;
}): string | undefined {
  const covers = song.covers ?? [];
  return (
    covers.find((c) => c === song.main_cover) ?? covers[0] ?? (song.release_cover || undefined)
  );
}
