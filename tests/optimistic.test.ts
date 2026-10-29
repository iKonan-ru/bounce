import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { editsInFlight, optimisticEdit } from '@/lib/optimistic';

type Item = { id: string; subs: string[] };
const KEY = ['tasks', 'p1'];

function setup() {
  const client = new QueryClient();
  client.setQueryData<Item[]>(KEY, [{ id: 'a', subs: [] }]);
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const add = (sub: string) =>
    client.setQueryData<Item[]>(KEY, (list) =>
      list?.map((x) => (x.id === 'a' ? { ...x, subs: [...x.subs, sub] } : x)),
    );
  const subs = () => client.getQueryData<Item[]>(KEY)?.[0]?.subs;
  return { client, invalidate, add, subs };
}

function deferred() {
  let resolve: () => void = () => {};
  let reject: (e: unknown) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('оптимистичная правка', () => {
  it('видна сразу; две подряд - перечитывание одно, после последней', async () => {
    const { client, invalidate, add, subs } = setup();
    const first = deferred();
    const second = deferred();
    const a = optimisticEdit(
      client,
      'tasks',
      () => add('A'),
      () => first.promise,
    );
    await Promise.resolve();
    await Promise.resolve();
    const b = optimisticEdit(
      client,
      'tasks',
      () => add('B'),
      () => second.promise,
    );
    await vi.waitFor(() => expect(subs()).toEqual(['A', 'B']));
    expect(editsInFlight('tasks')).toBe(true);
    first.resolve();
    await a;
    // первая закончилась, вторая ещё в пути: перечитывания нет - оно откатило бы B
    expect(invalidate).not.toHaveBeenCalled();
    second.resolve();
    await b;
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(editsInFlight('tasks')).toBe(false);
  });

  it('перечитывание во время правки не откатывает её', async () => {
    const { client, add, subs } = setup();
    const req = deferred();
    const edit = optimisticEdit(
      client,
      'tasks',
      () => add('A'),
      () => req.promise,
    );
    await vi.waitFor(() => expect(subs()).toEqual(['A']));
    // сервер ещё не знает о правке: ответ без неё (возврат в приложение, новый экран)
    await client.fetchQuery({ queryKey: KEY, queryFn: () => [{ id: 'a', subs: [] }] });
    expect(subs()).toEqual(['A']);
    req.resolve();
    await edit;
    // правка закончилась - следующий ответ сервера принимается как есть
    await client.fetchQuery({ queryKey: KEY, queryFn: () => [{ id: 'a', subs: ['A', 'X'] }] });
    expect(subs()).toEqual(['A', 'X']);
  });

  it('отказ сервера возвращает прежние данные', async () => {
    const { client, add, subs } = setup();
    await expect(
      optimisticEdit(
        client,
        'tasks',
        () => add('A'),
        () => Promise.reject(new Error('400')),
      ),
    ).rejects.toThrow();
    expect(subs()).toEqual([]);
  });
});
