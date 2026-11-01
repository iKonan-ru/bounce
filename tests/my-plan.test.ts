import { describe, expect, it } from 'vitest';
import type { Post } from '@/entities/post';
import type { Project } from '@/entities/project';
import type { TaskStage } from '@/entities/project-task';
import type { SongWithStages } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video } from '@/entities/video';
import type { VideoPost } from '@/entities/video-post';
import type { MyProjectData } from '@/pages/my-plan';
import { getMyPlanEntries, checkMatchesPlanSearch } from '@/pages/my-plan';
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
    taskStages: [],
    isIncomplete: false,
    isError: false,
    isFetching: false,
  };
}

describe('план проекта', () => {
  it('обычные задачи видео фильтруются и ищутся по видео даже при выключенной музыке', () => {
    const data = createData();
    data.project.directions = ['video'];
    data.project.music_release_enabled = false;
    data.posts = [];
    data.videoPosts = [];
    data.videos = [
      { id: 'v', title: 'Ночной город', status: 'done', song: 's' } as Video,
    ];
    data.tasks = [
      {
        ...data.tasks[0],
        id: 'video-task',
        title: 'Подготовить титры',
        video: 'v',
      } as Task,
      { ...data.tasks[0], id: 'project-task' } as Task,
    ];
    for (const done of [false, true]) {
      data.tasks[0] = { ...data.tasks[0], done } as Task;
      const entries = getMyPlanEntries(data, 'me', ContentDirection.Video, '');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.isDone).toBe(done);
      expect(entries[0] && checkMatchesPlanSearch(entries[0], 'ГОРОД')).toBe(
        true
      );
      expect(getMyPlanEntries(data, 'me', ContentDirection.Music, '')).toEqual(
        []
      );
      expect(
        getMyPlanEntries(data, 'me', ContentDirection.General, '')
      ).toHaveLength(1);
    }
  });

  it('задачи песни сохраняют связь без музыкального выпуска и ищутся по названию песни', () => {
    const data = createData();
    data.project.music_release_enabled = false;
    data.songs = [
      { id: 's', title: 'Тихий берег', status: 'active' } as SongWithStages,
    ];
    data.tasks = [{ ...data.tasks[0], song: 's' } as Task];
    const entries = getMyPlanEntries(data, 'me', ContentDirection.Music, '');
    expect(entries).toHaveLength(1);
    expect(entries[0] && checkMatchesPlanSearch(entries[0], 'берег')).toBe(
      true
    );
  });

  it('старые задачи без video остаются общими в проекте без медиа', () => {
    const data = createData();
    data.project.directions = ['other'];
    data.tasks = [data.tasks[0] as Task];
    expect(Object.hasOwn(data.tasks[0] ?? {}, 'video')).toBe(false);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.General, '')
    ).toHaveLength(1);
    expect(getMyPlanEntries(data, 'me', ContentDirection.Tasks, '')).toEqual(
      []
    );
  });

  it('этапы задач попадают в план по назначению, сроку и статусу', () => {
    const data = createData();
    data.project.directions.push('other');
    const stage: TaskStage = {
      collectionId: 'other_stages',
      collectionName: 'other_stages',
      project_task: 'task',
      expand: {},
      created: '' as IsoAutoDateString,
      updated: '' as IsoAutoDateString,
      id: 'other1',
      project: data.project.id,
      title: 'Встреча',
      status: 'not_started',
      deadline: '',
      assignees: [],
      substeps: [],
      position: 0,
    };
    data.taskStages = [
      stage,
      { ...stage, id: 'assigned', assignees: ['me'] },
      { ...stage, id: 'due', deadline: '2026-11-10' },
      { ...stage, id: 'active', status: 'in_progress' },
      { ...stage, id: 'done', status: 'done', deadline: '2026-11-10' },
    ];
    const entries = getMyPlanEntries(data, 'me', ContentDirection.Tasks, '');
    expect(entries.map((entry) => entry.id)).toEqual([
      'p1:other-stage:other:assigned',
      'p1:other-stage:other:due',
      'p1:other-stage:other:active',
    ]);
    expect(
      entries.some((entry) => checkMatchesPlanSearch(entry, 'встреча'))
    ).toBe(true);
    expect(
      getMyPlanEntries(data, 'me', ContentDirection.Tasks, 'me')
    ).toHaveLength(1);
    data.project.directions = ['music'];
    expect(getMyPlanEntries(data, 'me', ContentDirection.Tasks, '')).toEqual(
      []
    );
  });
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

describe('поиск в плане', () => {
  it('ищет задачи без учета регистра и пробелов по краям, пустой поиск показывает все', () => {
    const entries = getMyPlanEntries(createData(), 'me');
    const task = entries.find((entry) => entry.kind === 'work');

    if (!task) {
      throw new Error('Нет тестовой задачи');
    }

    expect(checkMatchesPlanSearch(task, '  зАдАчА  ')).toBe(true);
    expect(checkMatchesPlanSearch(task, 'не найдено')).toBe(false);
    expect(checkMatchesPlanSearch(task, '  ')).toBe(true);
  });

  it('находит публикации по названию и связанному материалу', () => {
    const data = createData();
    data.posts = data.posts.map((post) => ({ ...post, title: 'Анонс песни' }));
    data.videoPosts = data.videoPosts.map((post) => ({
      ...post,
      title: 'Трейлер',
    }));
    const entries = getMyPlanEntries(data, 'me');
    const music = entries.find((entry) => entry.kind === 'music');
    const video = entries.find((entry) => entry.kind === 'video');

    if (!music || !video) {
      throw new Error('Нет тестовых публикаций');
    }

    expect(checkMatchesPlanSearch(music, 'АНОНС')).toBe(true);
    expect(checkMatchesPlanSearch(video, 'трейлер')).toBe(true);
    expect(
      checkMatchesPlanSearch({ ...video, videoTitle: 'Ночной город' }, 'город')
    ).toBe(true);
    expect(checkMatchesPlanSearch(music, 'трейлер')).toBe(false);
  });
});
