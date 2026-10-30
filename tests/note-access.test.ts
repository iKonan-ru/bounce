import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshNoteAccess, queryKeys } from '@/shared/api';
import { QueryClient } from '@tanstack/react-query';

const { list, saveFiles, removeClient } = vi.hoisted(() => ({
  list: vi.fn(),
  saveFiles: vi.fn(),
  removeClient: vi.fn(),
}));
vi.mock('@/shared/api/pb', () => ({
  pb: {
    authStore: { isValid: true, record: { id: 'me' } },
    collection: () => ({ getFullList: list }),
  },
}));
vi.mock('@/shared/api/note-files', () => ({ saveNoteFileAccess: saveFiles }));
vi.mock('@/shared/api/audio-cache', () => ({ stopKeepingAudio: vi.fn() }));
vi.mock('@/shared/api/offline', () => ({ persister: { removeClient } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('отзыв заметок из кэша', () => {
  it('удаляет закрытые ленты, страницы поиска и сохраненный снимок', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', new EventTarget());
    const client = new QueryClient();
    const scope = queryKeys.notes.scope({ project: 'p' });
    const search = queryKeys.notes.search('p', '', 'new');
    client.setQueryData(scope, [{ id: 'hidden', text: 'секрет' }]);
    client.setQueryData(search, {
      pages: [{ items: [{ id: 'hidden' }], totalItems: 1 }],
      pageParams: [1],
    });
    list.mockResolvedValue([{ id: 'allowed' }]);
    await refreshNoteAccess(client);
    expect(client.getQueryData(scope)).toBeUndefined();
    expect(client.getQueryData(search)).toBeUndefined();
    expect(saveFiles).toHaveBeenLastCalledWith(['allowed']);
    expect(removeClient).toHaveBeenCalled();
  });

  it('при сигнале закрывает локальный доступ даже если сервер перестал отвечать', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', new EventTarget());
    const client = new QueryClient();
    const key = queryKeys.notes.scope({ project: 'p' });
    client.setQueryData(key, [{ id: 'hidden' }]);
    list.mockRejectedValue(new Error('нет сети'));
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await refreshNoteAccess(client, true);
    expect(client.getQueryData(key)).toBeUndefined();
    expect(saveFiles).toHaveBeenCalledWith([], false);
    error.mockRestore();
  });

  it('не возвращает доступ из запоздалого ответа и сохраняет разрешенный офлайн-кэш', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', new EventTarget());
    const client = new QueryClient();
    const key = queryKeys.notes.scope({ project: 'p' });
    client.setQueryData(key, [{ id: 'allowed' }]);
    const old = Promise.withResolvers<{ id: string }[]>();
    list
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ id: 'allowed' }]);
    const first = refreshNoteAccess(client);
    await refreshNoteAccess(client);
    old.resolve([{ id: 'hidden' }]);
    await first;
    expect(saveFiles).toHaveBeenCalledTimes(1);
    expect(saveFiles).toHaveBeenCalledWith(['allowed']);
    expect(client.getQueryData(key)).toEqual([{ id: 'allowed' }]);
    vi.stubGlobal('navigator', { onLine: false });
    await refreshNoteAccess(client);
    expect(client.getQueryData(key)).toEqual([{ id: 'allowed' }]);
  });
});
