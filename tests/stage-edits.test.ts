import type { RecordModel } from 'pocketbase';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectDirection } from '@/entities/project';
import { updateTemplateSubsteps } from '@/entities/song';
import { updateVideoStage } from '@/entities/video';
import { Collections, pb, queryKeys } from '@/shared/api';
import { QueryClient } from '@tanstack/react-query';

afterEach(() => vi.restoreAllMocks());

describe('Правки шаблонов этапов', () => {
  it.each([ProjectDirection.music, ProjectDirection.video])(
    '%s: правит только свое направление и откатывает отказ',
    async (direction) => {
      const client = new QueryClient();
      const template = { id: 'template', project: 'project', direction };
      const original = [{ ...template, substeps: [] }];
      const key = queryKeys.stageTemplates.ofProject('project', direction);
      const otherKey = queryKeys.stageTemplates.ofProject(
        'project',
        direction === 'music' ? 'video' : 'music'
      );
      client.setQueryData(key, original);
      client.setQueryData(otherKey, original);
      const request = Promise.withResolvers<RecordModel>();
      vi.spyOn(
        pb.collection(Collections.StageTemplates),
        'update'
      ).mockReturnValue(request.promise);
      const substeps = [{ id: 'step', title: 'Съемка' }];
      const edit = updateTemplateSubsteps(client, template, substeps);
      const rejected = expect(edit).rejects.toThrow('Отказ');
      await vi.waitFor(() =>
        expect(client.getQueryData(key)).toEqual([{ ...template, substeps }])
      );
      expect(client.getQueryData(otherKey)).toEqual(original);
      request.reject(new Error('Отказ'));
      await rejected;
      expect(client.getQueryData(key)).toEqual(original);
    }
  );
});

describe('Правки этапов видео', () => {
  /** Карточка и список с одним чек-листом */
  function createCache() {
    const client = new QueryClient();
    const video = {
      id: 'video',
      expand: {
        video_stages_via_video: [
          {
            id: 'stage',
            substeps: [
              { id: 'a', title: 'Кадр', done: false },
              { id: 'b', title: 'Звук', done: false },
            ],
          },
        ],
      },
    };
    const key = queryKeys.videos.one(video.id);
    const listKey = queryKeys.videos.ofProject('project');
    client.setQueryData(key, video);
    client.setQueryData(listKey, [video]);
    const getVideo = () => client.getQueryData<typeof video>(key);
    const getSubsteps = () =>
      getVideo()?.expand.video_stages_via_video[0]?.substeps ?? [];

    return { client, video, key, listKey, getVideo, getSubsteps };
  }

  it('быстрые отметки сохраняют предыдущий пункт и переживают устаревшее перечитывание', async () => {
    const { client, video, key, listKey, getVideo, getSubsteps } =
      createCache();
    const first = Promise.withResolvers<RecordModel>();
    const second = Promise.withResolvers<RecordModel>();
    const update = vi
      .spyOn(pb.collection(Collections.VideoStages), 'update')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const firstEdit = updateVideoStage(client, 'stage', {
      substeps: getSubsteps().map((step) => ({
        ...step,
        done: step.id === 'a',
      })),
    });
    await vi.waitFor(() => expect(getSubsteps()[0]?.done).toBe(true));
    const secondEdit = updateVideoStage(client, 'stage', {
      substeps: getSubsteps().map((step) => ({
        ...step,
        done: step.id === 'b' || step.done,
      })),
    });
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    await client.fetchQuery({ queryKey: key, queryFn: () => video });
    expect(getSubsteps().map((step) => step.done)).toEqual([true, true]);
    expect(client.getQueryData(listKey)).toEqual([getVideo()]);
    first.resolve({
      id: 'stage',
      collectionId: 'stages',
      collectionName: 'video_stages',
    });
    await firstEdit;
    second.resolve({
      id: 'stage',
      collectionId: 'stages',
      collectionName: 'video_stages',
    });
    await secondEdit;
  });

  it('при отказе возвращает карточку и список в исходное состояние', async () => {
    const { client, video, key, listKey } = createCache();
    vi.spyOn(
      pb.collection(Collections.VideoStages),
      'update'
    ).mockRejectedValue(new Error('Отказ'));
    await expect(
      updateVideoStage(client, 'stage', { status: 'done' })
    ).rejects.toThrow('Отказ');
    expect(client.getQueryData(key)).toEqual(video);
    expect(client.getQueryData(listKey)).toEqual([video]);
  });
});
