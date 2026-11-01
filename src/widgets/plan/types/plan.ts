import type { TaskStage } from '@/entities/project-task';
import type { SongStage, Song } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video, VideoStage } from '@/entities/video';

/** Вид пункта плана */
export enum PlanItemKind {
  /** Этап песни */
  Stage = 'stage',
  /** Этап видео */
  VideoStage = 'video-stage',
  /** Этап раздела Задачи */
  TaskStage = 'other-stage',
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
  mediaTitle?: string;
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
export interface PlanTaskStage {
  kind: PlanItemKind.TaskStage;
  id: string;
  stage: TaskStage;
  due: string;
  assignees: string[];
}

export type PlanItem = PlanStage | PlanVideoStage | PlanTaskStage | PlanTask;
