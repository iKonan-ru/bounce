import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, type MockInstance, vi } from 'vitest';
import { applyOptimisticEdit, checkIsEditInFlight } from '@/lib/optimistic';
import { QueryRoot } from '@/lib/query-keys';

/** Задача в кэше: id и подзадачи */
interface CachedTask {
  id: string;
  subtasks: string[];
}

/** Id единственной задачи в кэше */
const TASK_ID = 'a';

/** Ключ списка задач проекта в кэше */
const TASKS_KEY = [QueryRoot.Tasks, 'p1'];

/** Клиент запросов со списком из одной задачи и действия над ним */
interface TestCache {
  client: QueryClient;
  /** Подменённое перечитывание: считает вызовы, сервер не трогает */
  invalidate: MockInstance<QueryClient['invalidateQueries']>;
  /** Добавить подзадачу задаче в кэше (оптимистичная правка) */
  addSubtask: (subtask: string) => void;
  /** Подзадачи задачи в кэше */
  getSubtasks: () => string[] | undefined;
}

/** Задача с добавленной подзадачей, если это задача из теста */
function appendSubtask(task: CachedTask, subtask: string): CachedTask {
  if (task.id !== TASK_ID) {
    return task;
  }
  return { ...task, subtasks: [...task.subtasks, subtask] };
}

/** Кэш с одной задачей без подзадач */
function createTestCache(): TestCache {
  const client = new QueryClient();
  client.setQueryData<CachedTask[]>(TASKS_KEY, [{ id: TASK_ID, subtasks: [] }]);
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const addSubtask = (subtask: string): void => {
    client.setQueryData<CachedTask[]>(TASKS_KEY, (list) =>
      list?.map((task) => appendSubtask(task, subtask)),
    );
  };
  const getSubtasks = (): string[] | undefined =>
    client.getQueryData<CachedTask[]>(TASKS_KEY)?.[0]?.subtasks;
  return { client, invalidate, addSubtask, getSubtasks };
}

/** Обещание, которое тест выполняет сам */
function createDeferred(): PromiseWithResolvers<void> {
  return Promise.withResolvers<void>();
}

describe('оптимистичная правка', () => {
  it('видна сразу; две подряд - перечитывание одно, после последней', async () => {
    const { client, invalidate, addSubtask, getSubtasks } = createTestCache();
    const firstRequest = createDeferred();
    const secondRequest = createDeferred();
    const firstEdit = applyOptimisticEdit(
      client,
      QueryRoot.Tasks,
      () => addSubtask('A'),
      () => firstRequest.promise,
    );
    await Promise.resolve();
    await Promise.resolve();
    const secondEdit = applyOptimisticEdit(
      client,
      QueryRoot.Tasks,
      () => addSubtask('B'),
      () => secondRequest.promise,
    );
    await vi.waitFor(() => expect(getSubtasks()).toEqual(['A', 'B']));
    expect(checkIsEditInFlight(QueryRoot.Tasks)).toBe(true);
    firstRequest.resolve();
    await firstEdit;
    // первая закончилась, вторая ещё в пути: перечитывания нет - оно откатило бы B
    expect(invalidate).not.toHaveBeenCalled();
    secondRequest.resolve();
    await secondEdit;
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(checkIsEditInFlight(QueryRoot.Tasks)).toBe(false);
  });

  it('перечитывание во время правки не откатывает её', async () => {
    const { client, addSubtask, getSubtasks } = createTestCache();
    const request = createDeferred();
    const edit = applyOptimisticEdit(
      client,
      QueryRoot.Tasks,
      () => addSubtask('A'),
      () => request.promise,
    );
    await vi.waitFor(() => expect(getSubtasks()).toEqual(['A']));
    // сервер ещё не знает о правке: ответ без неё (возврат в приложение, новый экран)
    await client.fetchQuery({
      queryKey: TASKS_KEY,
      queryFn: () => [{ id: TASK_ID, subtasks: [] }],
    });
    expect(getSubtasks()).toEqual(['A']);
    request.resolve();
    await edit;
    // правка закончилась - следующий ответ сервера принимается как есть
    await client.fetchQuery({
      queryKey: TASKS_KEY,
      queryFn: () => [{ id: TASK_ID, subtasks: ['A', 'X'] }],
    });
    expect(getSubtasks()).toEqual(['A', 'X']);
  });

  it('отказ сервера возвращает прежние данные', async () => {
    const { client, addSubtask, getSubtasks } = createTestCache();
    await expect(
      applyOptimisticEdit(
        client,
        QueryRoot.Tasks,
        () => addSubtask('A'),
        () => Promise.reject(new Error('400')),
      ),
    ).rejects.toThrow();
    expect(getSubtasks()).toEqual([]);
  });
});
