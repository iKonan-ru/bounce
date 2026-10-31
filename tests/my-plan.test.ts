import { describe, expect, it } from 'vitest';
import type { Post } from '@/entities/post';
import type { Project } from '@/entities/project';
import type { Task } from '@/entities/task';
import type { VideoPost } from '@/entities/video-post';
import type { MyProjectData } from '@/pages/my-plan';
import { getMyPlanEntries, getPersonalPlanEntries } from '@/pages/my-plan';
import type { FileNameString, IsoAutoDateString } from '@/shared/api';
import { ContentDirection } from '@/shared/types';

/** Минимальные данные разных исходных коллекций, нужные для отбора */
function createData(): MyProjectData {
  const project: Project = {
    id: 'p1',
    expand: {},
    name: 'Первый',
    avatar: '' as FileNameString,
    links: [],
    created: '' as IsoAutoDateString,
    updated: '' as IsoAutoDateString,
    collectionId: 'projects',
    collectionName: 'projects',
    owner: 'me',
    editors: [],
    contributors: [],
    commenters: [],
    viewers: [],
    directions: ['music', 'video'],
    music_release_enabled: true,
  };
  const task = {
    id: 'same',
    project: project.id,
    title: 'Задача',
    assignees: ['me'],
    due: '',
    done: false,
    done_at: '',
    song: '',
  } as Task;
  const post = {
    id: 'same',
    project: project.id,
    assignees: ['me'],
    anchor: 'date',
    date: '2026-11-01 12:00:00.000Z',
    status: 'idea',
  } as Post;
  const videoPost = {
    id: 'same',
    project: project.id,
    assignees: 'me',
    scheduled_at: '',
    status: 'idea',
  } as VideoPost;

  return {
    project,
    tasks: [task, { ...task, id: 'other', assignees: ['other'] }],
    posts: [post, { ...post, id: 'other', assignees: ['other'] }],
    videoPosts: [videoPost, { ...videoPost, id: 'other', assignees: 'other' }],
    songs: [],
    videos: [],
    isIncomplete: false,
    isError: false,
    isFetching: false,
  };
}

describe('личный план', () => {
  it('показывает только назначения пользователя и не смешивает одинаковые id коллекций и проектов', () => {
    const data = createData();
    const entries = getMyPlanEntries(data, 'me');
    expect(entries.map((entry) => entry.kind)).toEqual([
      'work',
      'music',
      'video',
    ]);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(3);
    const second = getMyPlanEntries(
      { ...data, project: { ...data.project, id: 'p2' } },
      'me'
    );
    expect(new Set([...entries, ...second].map((entry) => entry.id)).size).toBe(
      6
    );
  });
  it('общий охват включает чужие и неназначенные записи без расширения прав', () => {
    const data = createData();
    const task = data.tasks[0];
    const post = data.posts[0];
    const videoPost = data.videoPosts[0];

    if (!task || !post || !videoPost) {
      throw new Error('Нет тестовых записей');
    }

    data.tasks.push({ ...task, id: 'unassigned', assignees: [] });
    data.posts.push({ ...post, id: 'unassigned', assignees: [] });
    data.videoPosts.push({
      ...videoPost,
      id: 'unassigned',
      assignees: '',
    });
    const entries = getMyPlanEntries(data, 'me', ContentDirection.All, '');
    expect(entries).toHaveLength(9);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.All, 'other')
    ).toHaveLength(3);
    const viewerData = {
      ...data,
      project: { ...data.project, owner: 'other', viewers: ['me'] },
    };
    expect(
      getMyPlanEntries(viewerData, 'me', ContentDirection.All, '').every(
        (entry) => !entry.canWork
      )
    ).toBe(true);
    expect(
      getMyPlanEntries(data, 'outsider', ContentDirection.All, '')
    ).toEqual([]);
  });
  it('исключает отозванный проект даже при наличии его данных в кэше', () => {
    const data = createData();
    expect(
      getMyPlanEntries(
        { ...data, project: { ...data.project, owner: 'other' } },
        'me'
      )
    ).toEqual([]);
  });
  it('назначение наблюдателя или комментатора не дает прав изменения', () => {
    const data = createData();
    for (const role of ['viewers', 'commenters'] as const) {
      const entries = getMyPlanEntries(
        {
          ...data,
          project: { ...data.project, owner: 'other', [role]: ['me'] },
        },
        'me'
      );
      expect(entries).toHaveLength(3);
      expect(entries.every((entry) => !entry.canWork)).toBe(true);
    }
    expect(getMyPlanEntries(data, 'me').every((entry) => entry.canWork)).toBe(
      true
    );
  });
  it('уважает выключенный музыкальный выпуск и направления', () => {
    const data = createData();
    const entries = getMyPlanEntries(
      { ...data, project: { ...data.project, music_release_enabled: false } },
      'me'
    );
    expect(entries.map((entry) => entry.kind)).toEqual(['work', 'video']);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.General).map(
        (entry) => entry.kind
      )
    ).toEqual(['work']);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.Music).map(
        (entry) => entry.kind
      )
    ).toEqual(['music']);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.Video).map(
        (entry) => entry.kind
      )
    ).toEqual(['video']);
  });
  it('сохраняет завершенные задачи и опубликованные записи отдельно от активных', () => {
    const data = createData();
    data.tasks = data.tasks.map((task) => ({ ...task, done: true }));
    data.posts = data.posts.map((post) => ({ ...post, status: 'published' }));
    data.videoPosts = data.videoPosts.map((post) => ({
      ...post,
      status: 'published',
    }));
    const entries = getMyPlanEntries(data, 'me');
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.isDone)).toBe(true);
  });
});

describe('личные задачи в плане и обзоре', () => {
  it('берет только свои задачи без проекта, включая выполненные', () => {
    const data = createData();
    const task = {
      ...data.tasks[0],
      id: 'personal',
      project: '',
      author: 'me',
      done: false,
    } as Task;
    const entries = getPersonalPlanEntries(
      [
        task,
        { ...task, id: 'done', done: true },
        { ...task, id: 'foreign', author: 'other' },
        { ...task, id: 'project', project: data.project.id },
      ],
      'me'
    );
    expect(entries.map((entry) => entry.id)).toEqual([
      'personal:task:personal',
      'personal:task:done',
    ]);
    expect(entries.map((entry) => entry.isDone)).toEqual([false, true]);
    expect(entries.every((entry) => entry.canWork && !entry.project)).toBe(
      true
    );
    const overview = [...getMyPlanEntries(data, 'me'), ...entries];
    expect(new Set(overview.map((entry) => entry.id)).size).toBe(
      overview.length
    );
  });
});
