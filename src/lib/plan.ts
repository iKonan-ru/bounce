import { type Song, type SongStage, songStatus, type Task } from './model';
import { type SongWithStages, stagesOf } from './queries';

// Планировщик проекта: этапы песен, которые уже в работе, со сроком или с исполнителем, и
// свои задачи проекта. Всё раскладывается по срокам.

export type PlanStage = {
  kind: 'stage';
  id: string;
  stage: SongStage;
  song: Song;
  due: string;
  assignee: string;
};
export type PlanTask = { kind: 'task'; id: string; task: Task; due: string; assignee: string };
export type PlanItem = PlanStage | PlanTask;

export type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export const BUCKETS: ReadonlyArray<Bucket> = [
  'overdue',
  'today',
  'tomorrow',
  'week',
  'later',
  'none',
];

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'На неделе',
  later: 'Позже',
  none: 'Без срока',
};

// день в местном времени: YYYY-MM-DD
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Сроки хранятся полднем UTC, поэтому первые 10 знаков - это календарный день срока.
export function bucketOf(due: string, today: Date): Bucket {
  if (!due) return 'none';
  const day = due.slice(0, 10);
  const t = dayKey(today);
  if (day < t) return 'overdue';
  if (day === t) return 'today';
  if (day === dayKey(addDays(today, 1))) return 'tomorrow';
  if (day <= dayKey(addDays(today, 6))) return 'week';
  return 'later';
}

// этап попадает в план, если песня в работе, а этап не закрыт и уже начат, со сроком или
// с исполнителем; остальные этапы ждут своей очереди на странице песни
export function stageInPlan(song: Song, stage: SongStage): boolean {
  if (songStatus(song) !== 'active') return false;
  if (stage.status === 'done' || stage.status === 'skipped') return false;
  return stage.status === 'in_progress' || Boolean(stage.deadline) || Boolean(stage.assignee);
}

// Открытые пункты плана. mine - только назначенные этому человеку.
export function planItems(
  songs: ReadonlyArray<SongWithStages>,
  tasks: ReadonlyArray<Task>,
  mine?: string,
): PlanItem[] {
  const items: PlanItem[] = [];
  for (const song of songs) {
    for (const stage of stagesOf(song)) {
      if (!stageInPlan(song, stage)) continue;
      items.push({
        kind: 'stage',
        id: stage.id,
        stage,
        song,
        due: stage.deadline ?? '',
        assignee: stage.assignee ?? '',
      });
    }
  }
  for (const task of tasks) {
    if (task.done) continue;
    items.push({
      kind: 'task',
      id: task.id,
      task,
      due: task.due ?? '',
      assignee: task.assignee ?? '',
    });
  }
  return mine ? items.filter((i) => i.assignee === mine) : items;
}

// Группы по срокам в порядке BUCKETS, пустые пропускаются. Внутри - по дате срока, при равных -
// как пришли (песни по ручному порядку, задачи по времени создания).
export function groupPlan(
  items: ReadonlyArray<PlanItem>,
  today: Date,
): { bucket: Bucket; items: PlanItem[] }[] {
  const groups = new Map<Bucket, PlanItem[]>();
  for (const item of items) {
    const b = bucketOf(item.due, today);
    groups.set(b, [...(groups.get(b) ?? []), item]);
  }
  return BUCKETS.filter((b) => groups.has(b)).map((bucket) => ({
    bucket,
    items: (groups.get(bucket) ?? [])
      .map((item, i) => ({ item, i }))
      .sort((a, b) => a.item.due.localeCompare(b.item.due) || a.i - b.i)
      .map((x) => x.item),
  }));
}

// выполненные задачи - сначала последние
export function doneTasks(tasks: ReadonlyArray<Task>, mine?: string): Task[] {
  return tasks
    .filter((t) => t.done && (!mine || t.assignee === mine))
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
}
