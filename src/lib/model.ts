// Формы JSON-полей: PocketBase их не проверяет, пишет их только приложение.
import type {
  UsersResponse,
  ProjectsResponse,
  SongsResponse,
  SongStagesResponse,
  StageTemplatesResponse,
  TasksResponse,
  PostsResponse,
  PromoTemplatesResponse,
  NotesResponse,
} from '@/shared/api';
import {
  PostsStatusOptions,
  PostsAnchorOptions,
  SongStagesStatusOptions,
  SongsStatusOptions,
} from '@/shared/api';
import { comparePositions } from '@/shared/utils';

/** Подэтап этапа песни: пункт чек-листа */
export interface Substep {
  id: string;
  title: string;
  done: boolean;
}

/** Подэтап в шаблоне этапов проекта */
export interface TemplateSubstep {
  id: string;
  title: string;
}

export type User = UsersResponse;

/** Ссылка проекта на страницу в сервисе (lib/services.ts) */
export interface ProjectLink {
  /** Id сервиса из MUSIC_SERVICES или 'other' - тогда своё название name */
  service: string;
  url: string;
  name?: string;
}

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

/** Песня с этапами (обратная связь song_stages.song) - так её отдают запросы песен */
export type SongWithStages = SongsResponse<{
  song_stages_via_song?: SongStage[];
}>;

export type StageTemplate = StageTemplatesResponse<TemplateSubstep[]>;

export type Task = TasksResponse;

export type Post = PostsResponse<string[]>;

/** Публикация промо-плана проекта: offset - дней до (минус) или после релиза */
export type PromoStep = PromoTemplatesResponse<string[]>;

export type Note = NotesResponse<
  string[],
  { author?: User; song?: Song; stage?: SongStage }
>;

// Значения полей-списков из схемы PocketBase: объекты значений и их типы генерирует pnpm typegen,
// поэтому это не enum, а те же объекты под понятными именами. Запись с сервера приходит со
// строкой этого типа, и свой enum пришлось бы приводить к ней через as.

/** Статус публикации */
export const PostStatus = PostsStatusOptions;

export type PostStatus = PostsStatusOptions;

/** Дата публикации: своя или от даты релиза песни */
export const PostAnchor = PostsAnchorOptions;

export type PostAnchor = PostsAnchorOptions;

/** Статус этапа песни */
export const StageStatus = SongStagesStatusOptions;

export type StageStatus = SongStagesStatusOptions;

/** Статус песни */
export const SongStatus = SongsStatusOptions;

export type SongStatus = SongsStatusOptions;

/** Этапы песни из expand (обратная связь song_stages.song) - по порядку */
export function getOrderedStages(song: SongWithStages): SongStage[] {
  const stages = song.expand?.song_stages_via_song ?? [];

  return [...stages].sort(comparePositions);
}
