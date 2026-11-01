// Планировщик проекта: этапы песен, которые уже в работе, со сроком или с исполнителем, и
// свои задачи проекта. Всё раскладывается по срокам.
import type { OtherStage } from '@/entities/other';
import type { Song, SongStage, SongWithStages } from '@/entities/song';
import {
  getSongStatus,
  CLOSED_STAGE_STATUSES,
  StageStatus,
  getOrderedStages,
} from '@/entities/song';
import type { Task } from '@/entities/task';
import type { Video } from '@/entities/video';
import { BUCKETS } from '@/shared/constants';
import { ContentDirection } from '@/shared/types';
import type { PlanGroup } from '@/shared/types';
import { checkIsAssignedTo, sortByDueDay, getBucket } from '@/shared/utils';
import { PLAN_SONG_STATUSES } from '../constants/plan';
import type {
  PlanStage,
  PlanTask,
  PlanItem,
  PlanVideoStage,
  PlanOtherStage,
} from '../types/plan';
import { PlanItemKind } from '../types/plan';

/**
 * Этап попадает в план, если песня в работе (или ещё не начата), а этап не закрыт и уже начат,
 * со сроком или с исполнителем
 *
 * Остальные этапы ждут своей очереди на странице песни
 */
export function checkIsStageInPlan(song: Song, stage: SongStage): boolean {
  if (!PLAN_SONG_STATUSES.has(getSongStatus(song))) {
    return false;
  }

  if (CLOSED_STAGE_STATUSES.has(stage.status)) {
    return false;
  }

  const isStarted = stage.status === StageStatus.in_progress;
  const hasAssignees = (stage.assignees ?? []).length > 0;

  return [isStarted, Boolean(stage.deadline), hasAssignees].some(Boolean);
}

/** Этап песни как пункт плана */
function convertToPlanStage(song: Song, stage: SongStage): PlanStage {
  return {
    kind: PlanItemKind.Stage,
    id: stage.id,
    stage,
    song,
    due: stage.deadline ?? '',
    assignees: stage.assignees ?? [],
  };
}

/** Задача как пункт плана */
function convertToPlanTask(task: Task): PlanTask {
  return {
    kind: PlanItemKind.Task,
    id: task.id,
    task,
    due: task.due ?? '',
    assignees: task.assignees ?? [],
  };
}

/** Открытые пункты плана; assigneeId - только те, где этот человек среди исполнителей */
export function getPlanItems(
  songs: readonly SongWithStages[],
  tasks: readonly Task[],
  assigneeId?: string,
  videos: readonly Video[] = [],
  direction = ContentDirection.All,
  otherStages: readonly OtherStage[] = []
): PlanItem[] {
  const stageItems = songs.flatMap((song) =>
    getOrderedStages(song)
      .filter((stage) => checkIsStageInPlan(song, stage))
      .map((stage) => convertToPlanStage(song, stage))
  );
  const taskItems = tasks.filter((task) => !task.done).map(convertToPlanTask);
  const videoItems = videos
    .filter((video) => ['not_started', 'active'].includes(video.status))
    .flatMap((video) =>
      (video.expand?.video_stages_via_video ?? [])
        .toSorted((a, b) => a.position - b.position)
        .filter(
          (stage) =>
            !CLOSED_STAGE_STATUSES.has(stage.status) &&
            (stage.status === StageStatus.in_progress ||
              Boolean(stage.deadline) ||
              stage.assignees.length > 0)
        )
        .map((stage): PlanVideoStage => ({
          kind: PlanItemKind.VideoStage,
          id: `video:${stage.id}`,
          stage,
          video,
          due: stage.deadline,
          assignees: stage.assignees,
        }))
    );
  const otherItems = otherStages
    .filter(
      (stage) =>
        !CLOSED_STAGE_STATUSES.has(stage.status) &&
        (stage.status === StageStatus.in_progress ||
          Boolean(stage.deadline) ||
          stage.assignees.length > 0)
    )
    .map((stage): PlanOtherStage => ({
      kind: PlanItemKind.OtherStage,
      id: `other:${stage.id}`,
      stage,
      due: stage.deadline,
      assignees: stage.assignees,
    }));
  const items: PlanItem[] = [
    ...stageItems,
    ...videoItems,
    ...otherItems,
    ...taskItems,
  ];

  return items.filter(
    (item) =>
      checkIsAssignedTo(item, assigneeId) &&
      checkMatchesDirection(item, direction)
  );
}

/**
 * Группы по срокам в порядке BUCKETS, пустые пропускаются
 *
 * Внутри - по дню срока; в один день - как пришли (песни по ручному порядку, задачи по времени
 * создания)
 */
export function groupPlanItems<Item extends Pick<PlanItem, 'due'>>(
  items: readonly Item[],
  today: Date
): PlanGroup<Item>[] {
  return BUCKETS.map((bucket) => ({
    bucket,
    items: sortByDueDay(
      items.filter((item) => getBucket(item.due, today) === bucket)
    ),
  })).filter((group) => group.items.length > 0);
}

/** Выполненные задачи - сначала последние */
export function getDoneTasks(
  tasks: readonly Task[],
  assigneeId?: string
): Task[] {
  return tasks
    .filter((task) => task.done)
    .filter((task) => checkIsAssignedTo(task, assigneeId))
    .sort((first, second) =>
      (second.done_at ?? '').localeCompare(first.done_at ?? '')
    );
}

/** Направление задачи определяется непосредственной связью с песней или видео */
export function checkMatchesDirection(
  item: PlanItem,
  direction: ContentDirection
): boolean {
  if (direction === ContentDirection.All) {
    return true;
  }

  if (item.kind === PlanItemKind.OtherStage) {
    return direction === ContentDirection.Other;
  }

  if (
    item.kind === PlanItemKind.VideoStage ||
    (item.kind === PlanItemKind.Task && item.task.video)
  ) {
    return direction === ContentDirection.Video;
  }

  const isMusic = item.kind === PlanItemKind.Stage || Boolean(item.task.song);

  return (
    direction === (isMusic ? ContentDirection.Music : ContentDirection.General)
  );
}
