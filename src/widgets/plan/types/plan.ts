import type { OtherStage } from '@/entities/other';
import type { SongStage, Song } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video, VideoStage } from '@/entities/video';

/** Вид пункта плана */
export enum PlanItemKind {
  /** Этап песни */
  Stage = 'stage',
  /** Этап видео */
  VideoStage = 'video-stage',
  /** Этап раздела Другое */
  OtherStage = 'other-stage',
  /** Задача проекта */
  Task = 'task',
}

/** Этап песни в плане */
export interface PlanStage {
  kind: PlanItemKind.Stage;
  id: string;
  stage: SongStage;
  song: Song;
  due: string;
  assignees: string[];
}

/** Задача проекта в плане */
export interface PlanTask {
  kind: PlanItemKind.Task;
  id: string;
  task: Task;
  due: string;
  assignees: string[];
}

/** Этап видео в плане */
export interface PlanVideoStage {
  kind: PlanItemKind.VideoStage;
  id: string;
  stage: VideoStage;
  video: Video;
  due: string;
  assignees: string[];
}

/** Этап без привязки к материалу */
export interface PlanOtherStage {
  kind: PlanItemKind.OtherStage;
  id: string;
  stage: OtherStage;
  due: string;
  assignees: string[];
}

export type PlanItem = PlanStage | PlanVideoStage | PlanOtherStage | PlanTask;
