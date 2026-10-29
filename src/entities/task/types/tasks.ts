import type { Task } from './task';

/** Новая задача плана */
export interface NewTask {
  project: string;
  title: string;
  author: string;
  due?: string;
  assignees?: string[];
  song?: string;
}

/** Правка задачи */
export type TaskPatch = Partial<
  Pick<Task, 'title' | 'done' | 'due' | 'assignees' | 'song'>
>;
