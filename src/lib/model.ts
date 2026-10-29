import type {
  NotesResponse,
  PostsResponse,
  PostsStatusOptions,
  ProjectsResponse,
  PromoTemplatesResponse,
  SongStagesResponse,
  SongStagesStatusOptions,
  SongsResponse,
  SongsStatusOptions,
  StageTemplatesResponse,
  TasksResponse,
  UsersResponse,
} from './pb-types';

// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
export type Substep = { id: string; title: string; done: boolean };
export type TemplateSubstep = { id: string; title: string };

// запись PocketBase с файлами: по ней строятся ссылки на файлы
export type FileRecord = { id: string; collectionId: string; collectionName: string };

export type User = UsersResponse;
// ссылка проекта на страницу в сервисе (lib/services.ts)
// service: id сервиса из MUSIC_SERVICES или 'other' - тогда своё название name
export type ProjectLink = { service: string; url: string; name?: string };

export type Project = ProjectsResponse<
  ProjectLink[],
  {
    owner?: User;
    editors?: User[];
    contributors?: User[];
    viewers?: User[];
  }
>;
export type Song = SongsResponse;
export type SongStage = SongStagesResponse<Substep[]>;
// песня с этапами (обратная связь song_stages.song) - так её отдают запросы песен
export type SongWithStages = SongsResponse<{ song_stages_via_song?: SongStage[] }>;
export type StageTemplate = StageTemplatesResponse<TemplateSubstep[]>;
export type Task = TasksResponse;
export type Post = PostsResponse<string[]>;
// публикация промо-плана проекта: offset - дней до (минус) или после релиза
export type PromoStep = PromoTemplatesResponse<string[]>;
export type PostStatus = PostsStatusOptions;

export type Note = NotesResponse<string[], { author?: User; song?: Song; stage?: SongStage }>;

export type StageStatus = SongStagesStatusOptions;
export type SongStatus = SongsStatusOptions;

// этапы песни из expand (обратная связь song_stages.song) - по порядку
export function stagesOf(song: SongWithStages): SongStage[] {
  return [...(song.expand?.song_stages_via_song ?? [])].sort((a, b) => a.position - b.position);
}
