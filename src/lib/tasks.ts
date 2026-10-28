import type { QueryClient } from '@tanstack/react-query';
import type PocketBase from 'pocketbase';
import type { Task } from './model';
import { collection, pb } from './pb';

export type NewTask = {
  project: string;
  title: string;
  author: string;
  due?: string;
  time?: string;
  assignees?: string[];
  song?: string;
};

export function createTask(client: PocketBase, t: NewTask): Promise<Task> {
  return collection(client, 'tasks').create<Task>({
    project: t.project,
    title: t.title.trim(),
    author: t.author,
    due: t.due ?? '',
    time: t.due ? (t.time ?? '') : '',
    assignees: t.assignees ?? [],
    song: t.song ?? '',
    done: false,
  });
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'done' | 'due' | 'time' | 'assignees' | 'song'>
>;

// Правка задачи: сразу в кэше плана, потом на сервере; после ответа план перечитывается.
export async function updateTask(
  client: QueryClient,
  task: Pick<Task, 'id' | 'project'>,
  patch: TaskPatch,
): Promise<void> {
  const key = ['tasks', task.project];
  const now = new Date().toISOString().replace('T', ' ');
  client.setQueryData<Task[]>(key, (list) =>
    list?.map((t) =>
      t.id === task.id
        ? {
            ...t,
            ...patch,
            ...(patch.done === undefined ? {} : { done_at: patch.done ? now : '' }),
          }
        : t,
    ),
  );
  try {
    await collection(pb, 'tasks').update(task.id, patch);
  } finally {
    await client.invalidateQueries({ queryKey: ['tasks'] });
  }
}
