import { getPostDate } from '@/entities/post';
import {
  getProjectRole,
  getAbilities,
  ProjectDirection,
} from '@/entities/project';
import { getSongForDisplay } from '@/entities/song';
import { getPublicationDay } from '@/entities/video-post';
import { ContentDirection } from '@/shared/types';
import {
  getPlanItems,
  getDoneTasks,
  PlanItemKind,
  checkMatchesDirection,
} from '@/widgets/plan';
import type { MyPlanEntry, MyProjectData } from '../types/my-plan';

/** Только мои назначения; членство и режим выпуска проверяются даже для сохраненного кэша */
export function getMyPlanEntries(
  data: MyProjectData,
  userId: string,
  direction = ContentDirection.All
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
  const work = getPlanItems(songs, data.tasks, userId, videos, direction);
  const done = getDoneTasks(data.tasks, userId)
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
        .filter((post) => post.assignees.includes(userId))
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
        .filter((post) => post.assignees === userId)
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
