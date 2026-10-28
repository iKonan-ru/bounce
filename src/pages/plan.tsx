import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { CalendarDays, ChevronDown, Disc3, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useProjectCrumbs } from '@/components/crumbs';
import { DateField } from '@/components/date-field';
import { EmptyState, GROUP, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { PersonSelect } from '@/components/person-select';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { TEXT_CLASS } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { dateLabel, fromDay } from '@/lib/format';
import { projectPeople, STAGE_STATUS_LABEL, type Substep, type Task, type User } from '@/lib/model';
import { collection, pb } from '@/lib/pb';
import {
  BUCKET_LABEL,
  type Bucket,
  bucketOf,
  doneTasks,
  groupPlan,
  type PlanItem,
  type PlanStage,
  planItems,
} from '@/lib/plan';
import { projectQuery, songsQuery, tasksQuery } from '@/lib/queries';
import { updateStage } from '@/lib/stages';
import { createTask, updateTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';

type Who = 'all' | 'mine';
const WHO_KEY = 'bounce.plan.who';
const WHO: { value: Who; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'mine', label: 'Мои' },
];

function readWho(): Who {
  try {
    return localStorage.getItem(WHO_KEY) === 'mine' ? 'mine' : 'all';
  } catch {
    return 'all';
  }
}

// отметка "сделано" сначала видна (зачёркивание), а пункт уходит из списка чуть позже
const LEAVE_MS = 450;

// люди проекта по id - для аватаров в строках
function usePeople(projectId: string): Map<string, User> {
  const project = useQuery(projectQuery(projectId));
  return new Map(
    project.data ? projectPeople(project.data).map((p) => [p.user.id, p.user] as const) : [],
  );
}

export function PlanPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/plan' });
  const me = useMe();
  const access = useAccess(projectId);
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const tasks = useQuery(tasksQuery(projectId));
  const [who, setWhoState] = useState<Who>(readWho);
  const [showDone, setShowDone] = useState(false);
  const [openTask, setOpenTask] = useState<string>();
  const setWho = (w: Who) => {
    setWhoState(w);
    try {
      localStorage.setItem(WHO_KEY, w);
    } catch {
      // выбор держится до перезагрузки
    }
  };

  const mine = who === 'mine' ? me?.id : undefined;
  const items = planItems(songs.data ?? [], tasks.data ?? [], mine);
  const groups = groupPlan(items, new Date());
  const done = doneTasks(tasks.data ?? [], mine);
  const loading = songs.isPending || tasks.isPending;
  const task = tasks.data?.find((t) => t.id === openTask);

  return (
    <div className="max-w-3xl">
      <PageHeader
        crumbs={crumbs}
        title="План"
        actions={
          <Segmented
            label="Чьи задачи"
            options={WHO}
            value={who}
            onChange={setWho}
            className="w-32 ring-1 ring-border/70 dark:ring-border/40"
          />
        }
      />
      <div className="flex flex-col gap-8">
        {access.work && me && <Composer projectId={projectId} meId={me.id} />}
        {loading && <Skeleton className="h-40 rounded-xl" />}
        {!loading && groups.length === 0 && done.length === 0 && (
          <EmptyState>{who === 'mine' ? 'На вас пока ничего' : 'Пока пусто'}</EmptyState>
        )}
        {groups.map((g) => (
          <Section
            key={g.bucket}
            title={
              <span className={cn(g.bucket === 'overdue' && 'text-led-red')}>
                {BUCKET_LABEL[g.bucket]}
              </span>
            }
            action={<span className="text-sm text-dim tabular-nums">{g.items.length}</span>}
          >
            <ul className={GROUP_ROWS}>
              {g.items.map((item) => (
                <li key={item.id} className="animate-enter">
                  <PlanRow
                    item={item}
                    bucket={g.bucket}
                    projectId={projectId}
                    canWork={access.work}
                    onOpenTask={setOpenTask}
                  />
                </li>
              ))}
            </ul>
          </Section>
        ))}
        {done.length > 0 && (
          <section>
            <button
              type="button"
              aria-expanded={showDone}
              onClick={() => setShowDone(!showDone)}
              className="mb-2 flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-dim transition-colors hover:text-ink"
            >
              Выполнено
              <span className="tabular-nums">{done.length}</span>
              <ChevronDown
                className={cn('size-4 transition-transform duration-200', showDone && 'rotate-180')}
              />
            </button>
            <Collapse open={showDone}>
              <ul className={GROUP_ROWS}>
                {done.map((t) => (
                  <li key={t.id}>
                    <TaskRow
                      task={t}
                      bucket="none"
                      projectId={projectId}
                      canWork={access.work}
                      onOpen={() => setOpenTask(t.id)}
                    />
                  </li>
                ))}
              </ul>
            </Collapse>
          </section>
        )}
      </div>
      {task && (
        <TaskDialog
          task={task}
          canWork={access.work}
          open={Boolean(task)}
          onOpenChange={(o) => !o && setOpenTask(undefined)}
        />
      )}
    </div>
  );
}

function PlanRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpenTask,
}: {
  item: PlanItem;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpenTask: (id: string) => void;
}) {
  if (item.kind === 'task') {
    return (
      <TaskRow
        task={item.task}
        bucket={bucket}
        projectId={projectId}
        canWork={canWork}
        onOpen={() => onOpenTask(item.id)}
      />
    );
  }
  return <StageRow item={item} bucket={bucket} projectId={projectId} canWork={canWork} />;
}

// срок справа в строке: просроченный - красным
function Due({ due, bucket }: { due: string; bucket: Bucket }) {
  if (!due) return null;
  const label = bucket === 'today' ? 'сегодня' : bucket === 'tomorrow' ? 'завтра' : dateLabel(due);
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        bucket === 'overdue' ? 'text-led-red' : 'text-dim',
      )}
    >
      {label}
    </span>
  );
}

// круглая отметка "сделано": сначала зачёркивание, через мгновение пункт уходит
function DoneCheck({
  checked,
  label,
  disabled,
  onDone,
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onDone: (done: boolean) => void;
}) {
  return (
    // зона нажатия больше самой отметки: у Checkbox есть невидимое поле вокруг (after:)
    <span className="-m-2 flex size-10 shrink-0 items-center justify-center">
      <Checkbox
        aria-label={label}
        disabled={disabled}
        className="size-5 rounded-full disabled:opacity-100"
        checked={checked}
        onCheckedChange={(v) => onDone(v === true)}
      />
    </span>
  );
}

// задержанное действие: пока пункт "уходит", отметка уже стоит
function useLeaving(): [boolean, (run: () => void) => void] {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    leaving,
    (run) => {
      setLeaving(true);
      timer.current = setTimeout(() => {
        run();
        setLeaving(false);
      }, LEAVE_MS);
    },
  ];
}

function TaskRow({
  task,
  bucket,
  projectId,
  canWork,
  onOpen,
}: {
  task: Task;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: () => void;
}) {
  const client = useQueryClient();
  const people = usePeople(projectId);
  const songs = useQuery(songsQuery(projectId));
  const song = task.song ? songs.data?.find((s) => s.id === task.song) : undefined;
  const assignee = task.assignee ? people.get(task.assignee) : undefined;
  const [leaving, leave] = useLeaving();
  const checked = task.done !== leaving;

  const toggle = (done: boolean) => {
    const run = () =>
      void updateTask(client, task, { done }).catch(() =>
        toast.error('Не сохранилось: проверьте соединение'),
      );
    if (done) leave(run);
    else run();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-opacity duration-300',
        leaving && 'opacity-50',
      )}
    >
      <DoneCheck checked={checked} label={task.title} disabled={!canWork} onDone={toggle} />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <span
          className={cn(
            'text-pretty transition-colors',
            checked && 'text-dim line-through decoration-dim/60',
          )}
        >
          {task.title}
        </span>
        {song && (
          <span className="flex items-center gap-1 truncate text-xs text-dim">
            <Disc3 className="size-3" />
            {song.title}
          </span>
        )}
      </button>
      {!task.done && <Due due={task.due ?? ''} bucket={bucket} />}
      {assignee && <Avatar user={assignee} className="size-6 text-[0.625rem]" />}
    </div>
  );
}

function StageRow({
  item,
  bucket,
  projectId,
  canWork,
}: {
  item: PlanStage;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
}) {
  const client = useQueryClient();
  const people = usePeople(projectId);
  const { stage, song } = item;
  const [open, setOpen] = useState(false);
  const [leaving, leave] = useLeaving();
  const subs = stage.substeps ?? [];
  const assignee = item.assignee ? people.get(item.assignee) : undefined;
  const save = (patch: Parameters<typeof updateStage>[3]) =>
    updateStage(client, song.id, stage.id, patch);

  const finish = () =>
    leave(() => {
      const before = stage.status;
      save({ status: 'done' })
        .then(() =>
          toast(`${stage.title}: готово`, {
            action: {
              label: 'Отменить',
              onClick: () => void save({ status: before }).catch(() => undefined),
            },
          }),
        )
        .catch(() => toast.error('Не сохранилось: проверьте соединение'));
    });

  const tick = (id: string, done: boolean) =>
    void save({
      substeps: subs.map((x): Substep => (x.id === id ? { ...x, done } : x)),
    }).catch(() => toast.error('Не сохранилось: проверьте соединение'));

  const details = [
    song.title,
    stage.status === 'in_progress' ? STAGE_STATUS_LABEL.in_progress : '',
    subs.length > 0 ? `${subs.filter((x) => x.done).length}/${subs.length}` : '',
  ].filter(Boolean);

  return (
    <div className={cn('transition-opacity duration-300', leaving && 'opacity-50')}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <DoneCheck
          checked={leaving}
          label={`${stage.title}: готово`}
          disabled={!canWork}
          onDone={(d) => d && finish()}
        />
        <Link
          to="/p/$projectId/songs/$songId/stages/$stageId"
          params={{ projectId, songId: song.id, stageId: stage.id }}
          className="flex min-h-9 min-w-0 flex-1 flex-col justify-center"
        >
          <span className={cn('text-pretty', leaving && 'text-dim line-through')}>
            {stage.title}
          </span>
          <span
            className={cn(
              'truncate text-xs',
              stage.status === 'in_progress' ? TEXT_CLASS.in_progress : 'text-dim',
            )}
          >
            <span className="text-dim">{details[0]}</span>
            {details.length > 1 && ` · ${details.slice(1).join(' · ')}`}
          </span>
        </Link>
        <Due due={item.due} bucket={bucket} />
        {assignee && <Avatar user={assignee} className="size-6 text-[0.625rem]" />}
        {subs.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-label="Подэтапы"
            onClick={() => setOpen(!open)}
            className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-groove hover:text-ink"
          >
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        )}
      </div>
      {subs.length > 0 && (
        <Collapse open={open}>
          <ul className="flex flex-col pb-2 pl-12">
            {subs.map((x) => (
              <li key={x.id} className="flex min-h-10 items-center gap-3 pr-4 md:min-h-8">
                <Checkbox
                  aria-label={x.title}
                  disabled={!canWork}
                  className="size-[1.125rem] rounded-full disabled:opacity-100"
                  checked={x.done}
                  onCheckedChange={(v) => tick(x.id, v === true)}
                />
                <span
                  className={cn('min-w-0 text-sm text-pretty', x.done && 'text-dim line-through')}
                >
                  {x.title}
                </span>
              </li>
            ))}
          </ul>
        </Collapse>
      )}
    </div>
  );
}

type DueChoice = 'none' | 'today' | 'tomorrow' | 'date';

// Новая задача: название, по желанию - срок (сегодня, завтра, дата) и "мне". Enter - добавить
// и писать следующую.
function Composer({ projectId, meId }: { projectId: string; meId: string }) {
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [focused, setFocused] = useState(false);
  const [due, setDue] = useState<DueChoice>('none');
  const [date, setDate] = useState<Date>();
  const [mine, setMine] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  const dueValue = (): string => {
    const d = new Date();
    if (due === 'today') return fromDay(d);
    if (due === 'tomorrow')
      return fromDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    if (due === 'date' && date) return fromDay(date);
    return '';
  };

  const add = useMutation({
    mutationFn: () =>
      createTask(pb, {
        project: projectId,
        title,
        author: meId,
        due: dueValue(),
        ...(mine ? { assignee: meId } : {}),
      }),
    onSuccess: async () => {
      setTitle('');
      input.current?.focus();
      await client.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => toast.error('Задача не добавлена: проверьте соединение'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim() && !add.isPending) add.mutate();
  }

  const expanded = focused || title.trim() !== '' || pickDate;
  const chip = (on: boolean) =>
    cn(
      'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors',
      on ? 'bg-tape text-tape-ink' : 'bg-groove/70 text-dim hover:text-ink',
    );

  return (
    <form
      onSubmit={submit}
      onFocus={() => {
        clearTimeout(blurTimer.current);
        setFocused(true);
      }}
      onBlur={() => {
        blurTimer.current = setTimeout(() => setFocused(false), 200);
      }}
      className={cn(GROUP, 'transition-shadow', expanded && 'ring-2 ring-ring/30')}
    >
      <div className="flex items-center gap-2 px-4">
        <Plus className="size-4 shrink-0 text-dim" />
        <label htmlFor="new-task" className="sr-only">
          Новая задача
        </label>
        <Input
          ref={input}
          id="new-task"
          placeholder="Новая задача"
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-11 dark:bg-transparent"
        />
        {title.trim() && (
          <Button type="submit" size="sm" className="h-8 animate-enter" disabled={add.isPending}>
            Добавить
          </Button>
        )}
      </div>
      <Collapse open={expanded}>
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          <button
            type="button"
            className={chip(due === 'today')}
            onClick={() => setDue(due === 'today' ? 'none' : 'today')}
          >
            Сегодня
          </button>
          <button
            type="button"
            className={chip(due === 'tomorrow')}
            onClick={() => setDue(due === 'tomorrow' ? 'none' : 'tomorrow')}
          >
            Завтра
          </button>
          <Popover open={pickDate} onOpenChange={setPickDate}>
            <PopoverTrigger asChild>
              <button type="button" className={chip(due === 'date')}>
                <CalendarDays className="size-3.5" />
                {due === 'date' && date ? dateLabel(fromDay(date)) : 'Дата'}
              </button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={due === 'date' ? date : undefined}
                onSelect={(d) => {
                  setDate(d);
                  setDue(d ? 'date' : 'none');
                  setPickDate(false);
                  input.current?.focus();
                }}
              />
            </PopoverContent>
          </Popover>
          <button type="button" className={chip(mine)} onClick={() => setMine(!mine)}>
            <UserIcon className="size-3.5" />
            Мне
          </button>
        </div>
      </Collapse>
    </form>
  );
}

const NO_SONG = 'none';

// Задача целиком: название, срок, кто делает, песня; удалить.
function TaskDialog({
  task,
  canWork,
  open,
  onOpenChange,
}: {
  task: Task;
  canWork: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const songs = useQuery(songsQuery(task.project));
  const [title, setTitle] = useState(task.title);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setTitle(task.title), [task.title]);

  const save = (patch: Parameters<typeof updateTask>[2]) =>
    void updateTask(client, task, patch).catch(() =>
      toast.error('Не сохранилось: проверьте соединение'),
    );
  const remove = useMutation({
    mutationFn: () => collection(pb, 'tasks').delete(task.id),
    onSuccess: async () => {
      setConfirming(false);
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Задача не удалена: проверьте соединение'),
  });
  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) save({ title: t });
    else setTitle(task.title);
  };
  const bucket = bucketOf(task.due ?? '', new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Задача</DialogTitle>
          <div className="flex items-start gap-3 pr-8">
            <DoneCheck
              checked={task.done === true}
              label="Выполнено"
              disabled={!canWork}
              onDone={(done) => save({ done })}
            />
            <label htmlFor="task-title" className="sr-only">
              Название
            </label>
            <textarea
              id="task-title"
              rows={1}
              maxLength={300}
              disabled={!canWork}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-transparent px-1 py-0.5 text-lg font-medium outline-none focus:bg-groove/50 disabled:opacity-100"
            />
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Срок">
            <DateField
              quiet
              id="task-due"
              disabled={!canWork}
              value={task.due ?? ''}
              danger={bucket === 'overdue' && !task.done}
              placeholder="Без срока"
              onChange={(v) => save({ due: v })}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PersonSelect
              projectId={task.project}
              value={task.assignee ?? ''}
              disabled={!canWork}
              onChange={(assignee) => save({ assignee })}
            />
          </PropRow>
          <PropRow label="Песня">
            <Select
              value={task.song || NO_SONG}
              disabled={!canWork}
              onValueChange={(v) => save({ song: v === NO_SONG ? '' : v })}
            >
              <SelectTrigger
                aria-label="Песня"
                className={cn(
                  '-mr-2 h-9 max-w-52 border-0 bg-transparent shadow-none dark:bg-transparent',
                  !task.song && 'text-dim',
                )}
              >
                <SelectValue>
                  {songs.data?.find((s) => s.id === task.song)?.title ?? 'Без песни'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {(songs.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
                <SelectItem value={NO_SONG}>Без песни</SelectItem>
              </SelectContent>
            </Select>
          </PropRow>
        </div>
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          {canWork ? (
            <Button
              variant="ghost"
              className="-ml-2 text-led-red hover:bg-led-red/10 hover:text-led-red"
              onClick={() => setConfirming(true)}
            >
              <Trash2 data-icon="inline-start" />
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={`Удалить "${task.title}"?`}
          confirm="Удалить"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}
