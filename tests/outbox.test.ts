// Очередь черновиков заметок (lib/outbox.ts): IndexedDB и отправка подменены, решение
// "отправлено / повторить / отказ" и обращение с черновиками - настоящие.
import { ClientResponseError } from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  createNote as realCreateNote,
  PendingNote,
} from '@/entities/note';
import type { AbstractObject } from '@/shared/types';
import { QueryClient } from '@tanstack/react-query';

/** Подменённое хранилище IndexedDB: черновики по id */
const storedDrafts = new Map<string, PendingNote>();
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: (key: string) => Promise.resolve(storedDrafts.get(key)),
  set: (key: string, note: PendingNote) => {
    storedDrafts.set(key, note);

    return Promise.resolve();
  },
  del: (key: string) => {
    storedDrafts.delete(key);

    return Promise.resolve();
  },
  clear: () => {
    storedDrafts.clear();

    return Promise.resolve();
  },
  entries: () => Promise.resolve([...storedDrafts.entries()]),
}));

/** Подменённая отправка заметки на сервер */
const createNote =
  vi.fn<(...args: Parameters<typeof realCreateNote>) => Promise<unknown>>();
vi.mock('@/entities/note/api/notes', () => ({
  createNote: (...args: Parameters<typeof realCreateNote>) =>
    createNote(...args),
}));

const { dropForeignDrafts, dropPending, flushOutbox, queueNote } =
  await import('@/entities/note');
const { Collections, pb } = await import('@/shared/api');

/** Вошедший человек - автор черновиков по умолчанию */
const USER_ID = 'u1';

/** Другой человек на том же устройстве */
const OTHER_USER_ID = 'u2';

/** Где пишутся черновики: заметки проекта */
const SCOPE = { project: 'p00000000000001' };

/** Id коллекции пользователей в PocketBase */
const USERS_COLLECTION_ID = '_pb_users_auth_';

/** Миллисекунд в секунде */
const MS_PER_SECOND = 1000;

/** Срок жизни тестового токена, секунды */
const TOKEN_LIFETIME_SECONDS = 3600;

/** Первый повтор отправки после сбоя сервера, мс */
const FIRST_RETRY_DELAY_MS = 30_000;

/** Id записи PocketBase: 15 строчных латинских букв и цифр */
const RECORD_ID_RE = /^[a-z0-9]{15}$/;

/** Ответ продления сессии: сессия жива */
const ALIVE_SESSION = {
  token: '',
  record: { id: USER_ID, collectionId: 'x', collectionName: Collections.Users },
};

/** Клиент запросов, который получает очередь */
const queryClient = new QueryClient();

/** Подменённое продление сессии: по нему очередь решает, жива ли сессия */
const authRefresh = vi.spyOn(pb.collection(Collections.Users), 'authRefresh');

/** Часть JWT: JSON в base64url */
function encodeTokenPart(payload: AbstractObject): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/** Войти человеком с этим id: токен не проверяется, важен только срок */
function signIn(id: string): void {
  const exp = Math.floor(Date.now() / MS_PER_SECOND) + TOKEN_LIFETIME_SECONDS;
  const header = encodeTokenPart({ alg: 'HS256' });
  const payload = encodeTokenPart({ exp, type: 'auth' });
  pb.authStore.save(`${header}.${payload}.sig`, {
    id,
    collectionId: USERS_COLLECTION_ID,
    collectionName: Collections.Users,
  });
}

/** Ошибка ответа PocketBase с кодом статуса и ошибками полей */
function createResponseError(
  status: number,
  data: AbstractObject = {}
): ClientResponseError {
  return new ClientResponseError({
    status,
    response: { status, message: 'x', data },
  });
}

/** Положить в очередь черновик с текстом */
function queueDraft(text: string, author = USER_ID): Promise<void> {
  return queueNote({ scope: SCOPE, author, text, images: [], audio: [] });
}

/** Черновики в хранилище */
function getStoredDrafts(): PendingNote[] {
  return [...storedDrafts.values()];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  storedDrafts.clear();
  createNote.mockReset();
  authRefresh.mockReset();
  signIn(USER_ID);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('очередь черновиков заметок', () => {
  it('отправленные уходят из очереди; заметка с тем же id уже на сервере - тоже', async () => {
    await queueDraft('раз');
    await queueDraft('два');
    createNote
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        createResponseError(400, { id: { code: 'validation_not_unique' } })
      );
    await flushOutbox(queryClient);
    expect(getStoredDrafts()).toEqual([]);
    // id черновика уходит на сервер как id записи
    const sentIds = createNote.mock.calls.map((call) => call[3].id ?? '');
    expect(sentIds).toHaveLength(2);
    expect(sentIds.every((id) => RECORD_ID_RE.test(id))).toBe(true);
  });

  it('сервер недоступен: черновики ждут, следующие не трогаются, повтор - по таймеру', async () => {
    await queueDraft('раз');
    await queueDraft('два');
    createNote.mockRejectedValue(createResponseError(502));
    await flushOutbox(queryClient);
    expect(createNote).toHaveBeenCalledTimes(1);
    expect(getStoredDrafts().map((draft) => draft.rejected ?? false)).toEqual([
      false,
      false,
    ]);

    createNote.mockReset();
    createNote.mockResolvedValue({});
    await vi.advanceTimersByTimeAsync(FIRST_RETRY_DELAY_MS);
    expect(createNote).toHaveBeenCalledTimes(2);
    expect(getStoredDrafts()).toEqual([]);
  });

  it('отказ сервера при живой сессии - черновик отклонён, при закрытой - ждёт', async () => {
    await queueDraft('в закрытый проект');
    createNote.mockRejectedValue(createResponseError(400));
    authRefresh.mockRejectedValueOnce(createResponseError(401));
    await flushOutbox(queryClient);
    expect(getStoredDrafts()[0]?.rejected).toBeUndefined();

    authRefresh.mockResolvedValueOnce(ALIVE_SESSION);
    await flushOutbox(queryClient);
    expect(getStoredDrafts()[0]?.rejected).toBe(true);
  });

  it('черновики другого человека не отправляются; его вход стирает чужие', async () => {
    await queueDraft('от u1');
    signIn(OTHER_USER_ID);
    await flushOutbox(queryClient);
    expect(createNote).not.toHaveBeenCalled();
    await queueDraft('от u2', OTHER_USER_ID);
    await dropForeignDrafts(OTHER_USER_ID);
    expect(getStoredDrafts().map((draft) => draft.text)).toEqual(['от u2']);
  });

  it('черновик, удалённый во время отправки, не возвращается', async () => {
    await queueDraft('удалят');
    const [queuedDraft] = getStoredDrafts();
    createNote.mockImplementation(async () => {
      if (queuedDraft) {
        await dropPending(queuedDraft.id);
      }

      throw createResponseError(400);
    });
    authRefresh.mockResolvedValue(ALIVE_SESSION);
    await flushOutbox(queryClient);
    expect(getStoredDrafts()).toEqual([]);
  });
});
