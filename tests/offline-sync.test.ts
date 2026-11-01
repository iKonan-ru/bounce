import type { RecordModel } from 'pocketbase';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncProject } from '@/features/offline-sync';
import { Collections, pb, queryKeys } from '@/shared/api';
import { QueryClient } from '@tanstack/react-query';

afterEach(() => {
  pb.authStore.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Вход автора и кэш всех запросов, которые делает syncProject, кроме заметок */
function setupSync(project: string): {
  client: QueryClient;
  response: PromiseWithResolvers<RecordModel[]>;
  sync: Promise<void>;
  isLoadStarted: () => void;
} {
  vi.stubGlobal('navigator', { onLine: true });
  const token = `header.${btoa(JSON.stringify({ exp: 9999999999 }))}.signature`;
  pb.authStore.save(token, {
    id: 'author',
    collectionId: 'users',
    collectionName: 'users',
  });
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  for (const key of [
    queryKeys.songs.ofProject(project),
    queryKeys.videos.ofProject(project),
    queryKeys.videoPosts.ofProject(project),
    queryKeys.otherStages.ofProject(project),
    queryKeys.users.all,
    queryKeys.projects.one(project),
    queryKeys.stageTemplates.ofProject(project),
    queryKeys.stageTemplates.ofProject(project, 'video'),
    queryKeys.promo.ofProject(project),
    queryKeys.posts.ofProject(project),
    queryKeys.tasks.ofProject(project),
  ]) {
    client.setQueryData(key, []);
  }
  const response = Promise.withResolvers<RecordModel[]>();
  const load = vi
    .spyOn(pb.collection(Collections.Notes), 'getFullList')
    .mockReturnValue(response.promise);
  const sync = syncProject(client, project);

  return {
    client,
    response,
    sync,
    isLoadStarted: () => expect(load).toHaveBeenCalledOnce(),
  };
}

/** Заметка, которую сервер вернул после начала загрузки */
function getNote(project: string): RecordModel {
  return {
    id: 'private-note',
    collectionId: 'notes',
    collectionName: 'notes',
    project,
    text: 'Личный текст',
  };
}

describe('Офлайн-загрузка и выход из аккаунта', () => {
  it('запоздалые заметки не возвращаются в очищенный кэш после выхода', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const project = 'logout-project';
    const { client, response, sync, isLoadStarted } = setupSync(project);
    await vi.waitFor(isLoadStarted);
    pb.authStore.clear();
    client.clear();
    response.resolve([getNote(project)]);
    await sync;
    expect(
      client.getQueryData(queryKeys.notes.scope({ project }))
    ).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('без выхода заметки раскладываются по лентам', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const project = 'stay-project';
    const { client, response, sync, isLoadStarted } = setupSync(project);
    await vi.waitFor(isLoadStarted);
    response.resolve([getNote(project)]);
    await sync;
    expect(
      client.getQueryData(queryKeys.notes.scope({ project }))
    ).toMatchObject([{ id: 'private-note' }]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
