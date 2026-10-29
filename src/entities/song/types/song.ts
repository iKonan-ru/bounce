import type {
  SongsResponse,
  SongStagesResponse,
  StageTemplatesResponse,
} from '@/shared/api';
import { SongStagesStatusOptions, SongsStatusOptions } from '@/shared/api';

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

export type Song = SongsResponse;

export type SongStage = SongStagesResponse<Substep[]>;

/** Песня с этапами (обратная связь song_stages.song) - так её отдают запросы песен */
export type SongWithStages = SongsResponse<{
  song_stages_via_song?: SongStage[];
}>;

export type StageTemplate = StageTemplatesResponse<TemplateSubstep[]>;

/** Статус этапа песни */
export const StageStatus = SongStagesStatusOptions;

export type StageStatus = SongStagesStatusOptions;

/** Статус песни */
export const SongStatus = SongsStatusOptions;

export type SongStatus = SongsStatusOptions;
