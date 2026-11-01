import type { QueryRoot } from './query-keys';

/** Корни ключей с оптимистичными правками и откатом при отказе сервера */
export type EditRoot =
  | QueryRoot.Songs
  | QueryRoot.Videos
  | QueryRoot.ProjectTasks
  | QueryRoot.TaskStages
  | QueryRoot.StageTemplates
  | QueryRoot.Tasks
  | QueryRoot.Posts;
