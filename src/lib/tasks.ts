import type { QueryClient } from '@tanstack/react-query';
import type PocketBase from 'pocketbase';
import type { Task } from './model';
import { optimisticEdit } from './optimistic';
import { collection, pb } from './pb';
import { queryKeys } from './query-keys';

export type NewTask = {
  project: string;
  title: string;
  author: string;
  due?: string;
  assignees?: string[];
  song?: string;
};

export function createTask(client: PocketBase, t: NewTask): Promise<Task> {
  return collection(client, 'tasks').create<Task>({
    project: t.project,
    title: t.title.trim(),
    author: t.author,
    due: t.due ?? '',
    assignees: t.assignees ?? [],
    song: t.song ?? '',
    done: false,
  });
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'done' | 'due' | 'assignees' | 'song'>>;

// Правка задачи: сразу в кэше плана, потом на сервере (lib/optimistic.ts).
export async function updateTask(
  client: QueryClient,
  task: Pick<Task, 'id' | 'project'>,
  patch: TaskPatch,
): Promise<void> {
  const key = queryKeys.tasks.ofProject(task.project);
  const now = new Date().toISOString().replace('T', ' ');
  await optimisticEdit(
    client,
    'tasks',
    () =>
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
      ),
    () => collection(pb, 'tasks').update(task.id, patch),
  );
}
