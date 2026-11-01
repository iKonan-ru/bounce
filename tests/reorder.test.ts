import type { BatchService } from 'pocketbase';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reorderOtherStages } from '@/entities/other';
import type { OtherStage } from '@/entities/other';
import { reorderVideoStages } from '@/entities/video';
import type { Video, VideoStage } from '@/entities/video';
import { pb, queryKeys } from '@/shared/api';
import { QueryClient } from '@tanstack/react-query';

afterEach(() => vi.restoreAllMocks());

/** Пакетный запрос, который завершается позже, когда решит тест */
function mockBatch(): PromiseWithResolvers<unknown[]> {
  const request = Promise.withResolvers<unknown[]>();
  vi.spyOn(pb, 'createBatch').mockReturnValue({
    collection: () => ({ update: vi.fn() }),
    send: () => request.promise,
  } as unknown as BatchService);

  return request;
}

/** Этапы с позициями 0, 1, 2 */
function createStages<
  Stage extends { id: string; position: number },
>(): Stage[] {
  return ['a', 'b', 'c'].map(
    (id, position) => ({ id, position, title: id }) as unknown as Stage
  );
}

describe('Порядок этапов раздела "Другое"', () => {
  const key = queryKeys.otherStages.ofProject('project');
  const getIds = (client: QueryClient): string[] | undefined =>
    client.getQueryData<OtherStage[]>(key)?.map((stage) => stage.id);

  it('сразу переставляет этапы в кэше', async () => {
    const client = new QueryClient();
    const stages = createStages<OtherStage>();
    client.setQueryData(key, stages);
    const request = mockBatch();
    const edit = reorderOtherStages(client, [
      stages[2] as OtherStage,
      stages[0] as OtherStage,
      stages[1] as OtherStage,
    ]);
    await vi.waitFor(() => expect(getIds(client)).toEqual(['c', 'a', 'b']));
    request.resolve([]);
    await edit;
  });

  it('при отказе возвращает прежний порядок', async () => {
    const client = new QueryClient();
    const stages = createStages<OtherStage>();
    client.setQueryData(key, stages);
    const request = mockBatch();
    const edit = reorderOtherStages(client, [
      stages[1] as OtherStage,
      stages[0] as OtherStage,
      stages[2] as OtherStage,
    ]);
    const rejected = expect(edit).rejects.toThrow('Отказ');
    await vi.waitFor(() => expect(getIds(client)).toEqual(['b', 'a', 'c']));
    request.reject(new Error('Отказ'));
    await rejected;
    expect(client.getQueryData(key)).toEqual(stages);
  });
});

describe('Порядок этапов видео', () => {
  /** Карточка и список проекта с тремя этапами */
  function createCache(): {
    client: QueryClient;
    stages: VideoStage[];
    video: Video;
    getIds: () => (string | undefined)[];
  } {
    const client = new QueryClient();
    const stages = createStages<VideoStage>();
    const video = {
      id: 'video',
      expand: { video_stages_via_video: stages },
    } as unknown as Video;
    client.setQueryData(queryKeys.videos.one(video.id), video);
    client.setQueryData(queryKeys.videos.ofProject('project'), [video]);
    const getIds = (): (string | undefined)[] =>
      client
        .getQueryData<Video>(queryKeys.videos.one(video.id))
        ?.expand?.video_stages_via_video?.toSorted(
          (first, second) => first.position - second.position
        )
        .map((stage) => stage.id) ?? [];

    return { client, stages, video, getIds };
  }

  it('сразу переставляет этапы в карточке и в списке', async () => {
    const { client, stages, video, getIds } = createCache();
    const request = mockBatch();
    const edit = reorderVideoStages(client, video.id, [
      stages[2] as VideoStage,
      stages[0] as VideoStage,
      stages[1] as VideoStage,
    ]);
    await vi.waitFor(() => expect(getIds()).toEqual(['c', 'a', 'b']));
    const listed = client.getQueryData<Video[]>(
      queryKeys.videos.ofProject('project')
    );
    expect(
      listed?.[0]?.expand?.video_stages_via_video?.map(
        (stage) => stage.position
      )
    ).toEqual([1, 2, 0]);
    request.resolve([]);
    await edit;
  });

  it('при отказе возвращает прежний порядок', async () => {
    const { client, stages, video, getIds } = createCache();
    const request = mockBatch();
    const edit = reorderVideoStages(client, video.id, [
      stages[1] as VideoStage,
      stages[0] as VideoStage,
      stages[2] as VideoStage,
    ]);
    const rejected = expect(edit).rejects.toThrow('Отказ');
    await vi.waitFor(() => expect(getIds()).toEqual(['b', 'a', 'c']));
    request.reject(new Error('Отказ'));
    await rejected;
    expect(getIds()).toEqual(['a', 'b', 'c']);
    expect(client.getQueryData(queryKeys.videos.one(video.id))).toEqual(video);
  });
});
