import { afterEach, describe, expect, it, vi } from 'vitest';
import { notesQuery } from '@/entities/note';
import {
  taskStagesQuery,
  projectTasksQuery,
  updateTaskStage,
} from '@/entities/project-task';
import type { TaskStage, ProjectTask } from '@/entities/project-task';
import type { IsoAutoDateString } from '@/shared/api';
import { getCollection, Collections, pb, queryKeys } from '@/shared/api';
import { getPlanItems } from '@/widgets/plan';
import { QueryClient } from '@tanstack/react-query';

afterEach(() => vi.restoreAllMocks());

/** Этап задачи с заданным родителем. */
function createStage(id: string, parent: string): TaskStage {
  return {
    created: '' as IsoAutoDateString,
    updated: '' as IsoAutoDateString,
    collectionId: 'stages',
    collectionName: 'other_stages',
    id,
    project: 'p',
    project_task: parent,
    title: id,
    status: 'in_progress',
    substeps: [],
    deadline: '',
    assignees: [],
    position: 0,
    expand: {},
  } as TaskStage;
}

describe('карточки задач', () => {
  it('читает задачи и этапы своего проекта с родительскими карточками', async () => {
    const cards = vi
      .spyOn(getCollection(pb, Collections.ProjectTasks), 'getFullList')
      .mockResolvedValue([]);
    const stages = vi
      .spyOn(getCollection(pb, Collections.OtherStages), 'getFullList')
      .mockResolvedValue([]);
    const client = new QueryClient();
    await client.fetchQuery(projectTasksQuery('p'));
    await client.fetchQuery(taskStagesQuery('p'));
    expect(cards).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'project = "p"' })
    );
    expect(stages).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: 'project = "p"',
        expand: 'project_task',
      })
    );
  });

  it('разделяет заметки двух задач и заметки этапа', async () => {
    const first = { project: 'p', other: true, project_task: 'first' };
    const second = { ...first, project_task: 'second' };
    expect(queryKeys.notes.scope(first)).not.toEqual(
      queryKeys.notes.scope(second)
    );
    const notes = vi
      .spyOn(getCollection(pb, Collections.Notes), 'getFullList')
      .mockResolvedValue([]);
    const client = new QueryClient();
    await client.fetchQuery(notesQuery(first));
    expect(notes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('project_task = "first"'),
      })
    );
    await client.fetchQuery(notesQuery({ ...second, other_stage: 'stage' }));
    expect(notes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('other_stage = "stage"'),
      })
    );
  });

  it('правит только выбранный этап и откатывает отказ, не трогая соседнюю задачу', async () => {
    const client = new QueryClient();
    const first = createStage('one', 'first');
    const second = createStage('two', 'second');
    const key = queryKeys.taskStages.ofProject('p');
    client.setQueryData(key, [first, second]);
    const request = Promise.withResolvers<never>();
    vi.spyOn(
      getCollection(pb, Collections.OtherStages),
      'update'
    ).mockReturnValue(request.promise);
    const edit = updateTaskStage(client, first.id, {
      status: 'done',
      substeps: [{ id: 'check', title: 'Проверить', done: true }],
    });
    const rejected = expect(edit).rejects.toThrow('Отказ');
    await vi.waitFor(() => {
      const stages = client.getQueryData<TaskStage[]>(key);
      expect(stages?.[0]?.status).toBe('done');
      expect(stages?.[1]).toEqual(second);
    });
    request.reject(new Error('Отказ'));
    await rejected;
    expect(client.getQueryData(key)).toEqual([first, second]);
  });

  it('этапы готовой задачи и задачи на паузе не попадают в план, как у видео', () => {
    const stage = createStage('one', 'first');
    for (const status of ['done', 'paused', 'active', 'not_started'] as const) {
      stage.expand = { project_task: { id: 'first', status } as ProjectTask };
      const items = getPlanItems([], [], undefined, [], undefined, [stage]);
      expect(items).toHaveLength(
        ['active', 'not_started'].includes(status) ? 1 : 0
      );
    }
  });
});
