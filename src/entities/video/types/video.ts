import type { Substep } from '@/entities/song';
import type { VideosResponse, VideoStagesResponse } from '@/shared/api';
import { VideosStatusOptions } from '@/shared/api';

/** Внешний рабочий материал, не аккаунт для публикации */
export interface VideoMaterial {
  name: string;
  url: string;
}

/** Этап производства */
export type VideoStage = VideoStagesResponse<Substep[]>;

/** Карточка с независимыми этапами */
export type Video = VideosResponse<
  VideoMaterial[],
  { video_stages_via_video?: VideoStage[] }
>;

/** Статус карточки */
export const VideoStatus = VideosStatusOptions;

export type VideoStatus = VideosStatusOptions;

/** Поля карточки, доступные редактору */
export type VideoPatch = { aspect?: Video['aspect'] | '' } & Partial<
  Pick<
    Video,
    'title' | 'description' | 'script' | 'song' | 'materials' | 'status'
  >
>;

/** Поля этапа */
export type VideoStagePatch = Partial<
  Pick<VideoStage, 'title' | 'status' | 'assignees' | 'deadline' | 'substeps'>
>;
