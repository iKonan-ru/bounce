// Очередь черновиков заметок (lib/outbox.ts): IndexedDB и отправка подменены, решение
// "отправлено / повторить / отказ" и обращение с черновиками - настоящие.
import { QueryClient } from '@tanstack/react-query';
import { ClientResponseError } from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingNote } from '@/lib/outbox';

const db = new Map<string, PendingNote>();
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (k: string) => db.get(k),
  set: async (k: string, v: PendingNote) => {
    db.set(k, v);
  },
  del: async (k: string) => {
    db.delete(k);
  },
  clear: async () => {
    db.clear();
  },
  entries: async () => [...db.entries()],
}));

const createNote = vi.fn();
vi.mock('@/lib/notes', () => ({
  createNote: (...args: unknown[]) => createNote(...args),
}));

const { dropForeignDrafts, dropPending, flushOutbox, queueNote } = await import('@/lib/outbox');
const { pb } = await import('@/lib/pb');

const SCOPE = { project: 'p00000000000001' };
const client = new QueryClient();
const refresh = vi.spyOn(pb.collection('users'), 'authRefresh');

function signIn(id: string) {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  pb.authStore.save(`${part({ alg: 'HS256' })}.${part({ exp, type: 'auth' })}.sig`, {
    id,
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
  });
}

const http = (status: number, data: Record<string, unknown> = {}) =>
  new ClientResponseError({ status, response: { status, message: 'x', data } });

const draft = (text: string, author = 'u1') =>
  queueNote({ scope: SCOPE, author, text, images: [], audio: [] });

const stored = () => [...db.values()];
const alive = { token: '', record: { id: 'u1', collectionId: 'x', collectionName: 'users' } };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  db.clear();
  createNote.mockReset();
  refresh.mockReset();
  signIn('u1');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('очередь черновиков заметок', () => {
  it('отправленные уходят из очереди; заметка с тем же id уже на сервере - тоже', async () => {
    await draft('раз');
    await draft('два');
    createNote
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(http(400, { id: { code: 'validation_not_unique' } }));
    await flushOutbox(client);
    expect(stored()).toEqual([]);
    // id черновика уходит на сервер как id записи
    const sentIds = createNote.mock.calls.map((c) => (c[3] as { id: string }).id);
    expect(sentIds).toHaveLength(2);
    expect(sentIds.every((id) => /^[a-z0-9]{15}$/.test(id))).toBe(true);
  });

  it('сервер недоступен: черновики ждут, следующие не трогаются, повтор - по таймеру', async () => {
    await draft('раз');
    await draft('два');
    createNote.mockRejectedValue(http(502));
    await flushOutbox(client);
    expect(createNote).toHaveBeenCalledTimes(1);
    expect(stored().map((n) => n.rejected ?? false)).toEqual([false, false]);

    createNote.mockReset();
    createNote.mockResolvedValue({});
    await vi.advanceTimersByTimeAsync(30_000);
    expect(createNote).toHaveBeenCalledTimes(2);
    expect(stored()).toEqual([]);
  });

  it('отказ сервера при живой сессии - черновик отклонён, при закрытой - ждёт', async () => {
    await draft('в закрытый проект');
    createNote.mockRejectedValue(http(400));
    refresh.mockRejectedValueOnce(http(401));
    await flushOutbox(client);
    expect(stored()[0]?.rejected).toBeUndefined();

    refresh.mockResolvedValueOnce(alive);
    await flushOutbox(client);
    expect(stored()[0]?.rejected).toBe(true);
  });

  it('черновики другого человека не отправляются; его вход стирает чужие', async () => {
    await draft('от u1');
    signIn('u2');
    await flushOutbox(client);
    expect(createNote).not.toHaveBeenCalled();
    await draft('от u2', 'u2');
    await dropForeignDrafts('u2');
    expect(stored().map((n) => n.text)).toEqual(['от u2']);
  });

  it('черновик, удалённый во время отправки, не возвращается', async () => {
    await draft('удалят');
    const [item] = stored();
    createNote.mockImplementation(async () => {
      if (item) await dropPending(item.id);
      throw http(400);
    });
    refresh.mockResolvedValue(alive);
    await flushOutbox(client);
    expect(stored()).toEqual([]);
  });
});
