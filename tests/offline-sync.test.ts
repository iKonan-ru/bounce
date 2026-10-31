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

describe('Офлайн-загрузка и выход из аккаунта', () => {
  it('запоздалые заметки не возвращаются в очищенный кэш после выхода', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const token = `header.${btoa(JSON.stringify({ exp: 9999999999 }))}.signature`;
    pb.authStore.save(token, {
      id: 'author',
      collectionId: 'users',
      collectionName: 'users',
    });
    const project = 'logout-project';
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    for (const key of [
      queryKeys.songs.ofProject(project),
      queryKeys.videos.ofProject(project),
      queryKeys.videoPosts.ofProject(project),
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
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    pb.authStore.clear();
    client.clear();
    response.resolve([
      {
        id: 'private-note',
        collectionId: 'notes',
        collectionName: 'notes',
        project,
        text: 'Личный текст',
      },
    ]);
    await sync;
    expect(
      client.getQueryData(queryKeys.notes.scope({ project }))
    ).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
