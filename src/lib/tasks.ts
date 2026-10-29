import type PocketBase from 'pocketbase';
import type { QueryClient } from '@tanstack/react-query';
import { convertToPbDateTime } from './format';
import type { Task } from './model';
import { applyOptimisticEdit } from './optimistic';
import { Collections, getCollection, pb } from './pb';
import { QueryRoot, queryKeys } from './query-keys';

/** Новая задача плана */
export interface NewTask {
  project: string;
  title: string;
  author: string;
  due?: string;
  assignees?: string[];
  song?: string;
}

/** Создать задачу плана */
export function createTask(client: PocketBase, input: NewTask): Promise<Task> {
  return getCollection(client, Collections.Tasks).create<Task>({
    project: input.project,
    title: input.title.trim(),
    author: input.author,
    due: input.due ?? '',
    assignees: input.assignees ?? [],
    song: input.song ?? '',
    done: false,
  });
}

/** Правка задачи */
export type TaskPatch = Partial<
  Pick<Task, 'title' | 'done' | 'due' | 'assignees' | 'song'>
>;

/** Задача с правкой; отметка "сделано" ставит или снимает и время выполнения */
function applyTaskPatch(task: Task, patch: TaskPatch, now: string): Task {
  if (patch.done === undefined) {
    return { ...task, ...patch };
  }

  const doneAt = patch.done ? now : '';

  return { ...task, ...patch, done_at: doneAt };
}

/** Правка задачи: сразу в кэше плана, потом на сервере (lib/optimistic.ts) */
export async function updateTask(
  client: QueryClient,
  task: Pick<Task, 'id' | 'project'>,
  patch: TaskPatch
): Promise<void> {
  const key = queryKeys.tasks.ofProject(task.project);
  const now = convertToPbDateTime(new Date());
  const patchCachedTask = (cached: Task): Task => {
    if (cached.id !== task.id) {
      return cached;
    }

    return applyTaskPatch(cached, patch, now);
  };
  await applyOptimisticEdit(
    client,
    QueryRoot.Tasks,
    () =>
      client.setQueryData<Task[]>(key, (list) => list?.map(patchCachedTask)),
    () => getCollection(pb, Collections.Tasks).update(task.id, patch)
  );
}
