import { getDayKey, getIsoDayKey } from './format';
import {
  getOrderedStages,
  type Song,
  type SongStage,
  SongStatus,
  type SongWithStages,
  StageStatus,
  type Task,
} from './model';
import { getSongStatus } from './release';
import { CLOSED_STAGE_STATUSES } from './statuses';

// Планировщик проекта: этапы песен, которые уже в работе, со сроком или с исполнителем, и
// свои задачи проекта. Всё раскладывается по срокам.

/** Вид пункта плана */
export enum PlanItemKind {
  /** Этап песни */
  Stage = 'stage',
  /** Задача проекта */
  Task = 'task',
}

/** Этап песни в плане */
export interface PlanStage {
  kind: PlanItemKind.Stage;
  id: string;
  stage: SongStage;
  song: Song;
  due: string;
  assignees: string[];
}

/** Задача проекта в плане */
export interface PlanTask {
  kind: PlanItemKind.Task;
  id: string;
  task: Task;
  due: string;
  assignees: string[];
}

export type PlanItem = PlanStage | PlanTask;

/** Группа сроков */
export enum Bucket {
  /** Срок прошёл */
  Overdue = 'overdue',
  /** Сегодня */
  Today = 'today',
  /** Завтра */
  Tomorrow = 'tomorrow',
  /** До конца ближайших семи дней */
  Week = 'week',
  /** Позже */
  Later = 'later',
  /** Без срока */
  None = 'none',
}

/** Группа плана: срок и пункты в нём */
export interface PlanGroup<Item> {
  bucket: Bucket;
  items: Item[];
}

/** Запись с исполнителями */
interface Assignable {
  assignees?: readonly string[] | undefined;
}

/** Запись со сроком */
interface Dated {
  due: string;
}

/** Группы сроков по порядку */
export const BUCKETS: readonly Bucket[] = Object.values(Bucket);

/** Подписи групп сроков */
export const BUCKET_LABEL: Record<Bucket, string> = {
  [Bucket.Overdue]: 'Просрочено',
  [Bucket.Today]: 'Сегодня',
  [Bucket.Tomorrow]: 'Завтра',
  [Bucket.Week]: 'На неделе',
  [Bucket.Later]: 'Позже',
  [Bucket.None]: 'Без срока',
};

/** Последний день группы "на неделе": через 6 дней от сегодня */
const WEEK_LAST_DAY_OFFSET = 6;

/** Статусы песни, этапы которой попадают в план: в работе или ещё не начата */
const PLAN_SONG_STATUSES: ReadonlySet<SongStatus> = new Set([
  SongStatus.active,
  SongStatus.not_started,
]);

/** Дата через days дней */
function addDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);

  return shifted;
}

/** Группа срока; сроки хранятся полднем UTC, поэтому первые 10 знаков - это календарный день срока */
export function getBucket(due: string, today: Date): Bucket {
  if (!due) {
    return Bucket.None;
  }

  const day = getIsoDayKey(due);
  const todayKey = getDayKey(today);

  if (day < todayKey) {
    return Bucket.Overdue;
  }

  if (day === todayKey) {
    return Bucket.Today;
  }

  if (day === getDayKey(addDays(today, 1))) {
    return Bucket.Tomorrow;
  }

  if (day <= getDayKey(addDays(today, WEEK_LAST_DAY_OFFSET))) {
    return Bucket.Week;
  }

  return Bucket.Later;
}

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

/** Исполнитель среди назначенных; без исполнителя - подходит любая запись */
export function checkIsAssignedTo(
  item: Assignable,
  assigneeId?: string
): boolean {
  if (!assigneeId) {
    return true;
  }

  return (item.assignees ?? []).includes(assigneeId);
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
  assigneeId?: string
): PlanItem[] {
  const stageItems = songs.flatMap((song) =>
    getOrderedStages(song)
      .filter((stage) => checkIsStageInPlan(song, stage))
      .map((stage) => convertToPlanStage(song, stage))
  );
  const taskItems = tasks.filter((task) => !task.done).map(convertToPlanTask);
  const items: PlanItem[] = [...stageItems, ...taskItems];

  return items.filter((item) => checkIsAssignedTo(item, assigneeId));
}

/** Пункты по дню срока; в один день - как пришли (сортировка устойчивая) */
export function sortByDueDay<Item extends Dated>(
  items: readonly Item[]
): Item[] {
  return [...items].sort((first, second) =>
    getIsoDayKey(first.due).localeCompare(getIsoDayKey(second.due))
  );
}

/**
 * Группы по срокам в порядке BUCKETS, пустые пропускаются
 *
 * Внутри - по дню срока; в один день - как пришли (песни по ручному порядку, задачи по времени
 * создания)
 */
export function groupPlanItems(
  items: readonly PlanItem[],
  today: Date
): PlanGroup<PlanItem>[] {
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
