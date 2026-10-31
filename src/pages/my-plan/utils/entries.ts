import { getPostDate } from '@/entities/post';
import {
  getProjectRole,
  getAbilities,
  ProjectDirection,
} from '@/entities/project';
import { getSongForDisplay } from '@/entities/song';
import type { Task } from '@/entities/task';
import { getPublicationDay } from '@/entities/video-post';
import { ContentDirection } from '@/shared/types';
import {
  getPlanItems,
  getDoneTasks,
  PlanItemKind,
  checkMatchesDirection,
} from '@/widgets/plan';
import type { MyPlanEntry, MyProjectData } from '../types/my-plan';

/** Назначения выбранного человека или все; членство и режим выпуска проверяются даже для сохраненного кэша */
export function getMyPlanEntries(
  data: MyProjectData,
  userId: string,
  direction = ContentDirection.All,
  assigneeId: string | undefined = userId
): MyPlanEntry[] {
  const { project } = data;
  const role = getProjectRole(project, userId);

  if (!role) {
    return [];
  }

  const canWork = getAbilities(role).canWork;
  const hasMusic = project.directions.includes(ProjectDirection.music);
  const hasVideo = project.directions.includes(ProjectDirection.video);
  const hasRelease = hasMusic && project.music_release_enabled;
  const songs = hasMusic
    ? data.songs.map((song) => getSongForDisplay(song, hasRelease))
    : [];
  const videos = hasVideo ? data.videos : [];
  const work = getPlanItems(songs, data.tasks, assigneeId, videos, direction);
  const done = getDoneTasks(data.tasks, assigneeId)
    .map((task) => ({
      kind: PlanItemKind.Task as const,
      id: task.id,
      task,
      due: task.due,
      assignees: task.assignees,
    }))
    .filter((item) => checkMatchesDirection(item, direction));
  const entries: MyPlanEntry[] = [...work, ...done].map((item) => ({
    id: `${project.id}:${item.kind}:${item.id}`,
    kind: 'work',
    item,
    project,
    due: item.due,
    isDone: item.kind === PlanItemKind.Task && item.task.done,
    canWork,
  }));

  if (
    hasRelease &&
    [ContentDirection.All, ContentDirection.Music].includes(direction)
  ) {
    entries.push(
      ...data.posts
        .filter((post) => !assigneeId || post.assignees.includes(assigneeId))
        .map((post): MyPlanEntry => ({
          id: `${project.id}:music:${post.id}`,
          kind: 'music',
          post,
          songs,
          project,
          due: getPostDate(post, songs),
          isDone: post.status === 'published',
          canWork,
        }))
    );
  }

  if (
    hasVideo &&
    [ContentDirection.All, ContentDirection.Video].includes(direction)
  ) {
    entries.push(
      ...data.videoPosts
        .filter((post) => !assigneeId || post.assignees === assigneeId)
        .map((post): MyPlanEntry => ({
          id: `${project.id}:video:${post.id}`,
          kind: 'video',
          post,
          project,
          videoTitle:
            videos.find((video) => video.id === post.video)?.title ?? 'Видео',
          due: getPublicationDay(post),
          isDone: post.status === 'published',
          canWork,
        }))
    );
  }

  return entries;
}

/** Личные задачи без проекта; автор проверяется также для сохраненного кэша */
export function getPersonalPlanEntries(
  tasks: readonly Task[],
  userId: string
): MyPlanEntry[] {
  return tasks
    .filter((task) => !task.project && task.author === userId)
    .map((task) => ({
      id: `personal:task:${task.id}`,
      kind: 'work',
      item: {
        kind: PlanItemKind.Task,
        id: task.id,
        task,
        due: task.due,
        assignees: task.assignees,
      },
      due: task.due,
      isDone: task.done,
      canWork: true,
    }));
}
