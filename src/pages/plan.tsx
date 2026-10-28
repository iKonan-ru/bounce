import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Disc3,
  Plus,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Collapse } from '@/components/collapse';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useProjectCrumbs } from '@/components/crumbs';
import { DateField } from '@/components/date-field';
import { MentionText, useMentionPeople, useMentions } from '@/components/mentions';
import { EmptyState, GROUP, GROUP_ROWS, PageHeader, Section } from '@/components/page';
import { AvatarStack, PeoplePicker } from '@/components/people-picker';
import { Due, usePeople } from '@/components/plan-bits';
import { ContentPlan } from '@/components/posts';
import { PropRow } from '@/components/prop-row';
import { Segmented } from '@/components/segmented';
import { StageStatusPicker, StatusDot } from '@/components/stage-status';
import { TEXT_CLASS } from '@/components/status';
import { SubstepsEditor } from '@/components/substeps';
import { TimeField } from '@/components/time-field';
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
import { mentionedIds } from '@/lib/mentions';
import {
  type Song,
  type SongStage,
  STAGE_STATUS_LABEL,
  type Substep,
  type Task,
} from '@/lib/model';
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
import { songsQuery, stagesOf, tasksQuery } from '@/lib/queries';
import { type StagePatch, updateStage } from '@/lib/stages';
import { createTask, updateTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';

type Who = 'all' | 'mine';
// дела (этапы и задачи) или контент-план (публикации)
type View = 'tasks' | 'content';
const VIEW_KEY = 'bounce.plan.view';
const VIEWS: { value: View; label: string }[] = [
  { value: 'tasks', label: 'Дела' },
  { value: 'content', label: 'Контент' },
];

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'content' ? 'content' : 'tasks';
  } catch {
    return 'tasks';
  }
}
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

export function PlanPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/plan' });
  const me = useMe();
  const access = useAccess(projectId);
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const tasks = useQuery(tasksQuery(projectId));
  const [who, setWhoState] = useState<Who>(readWho);
  const [showDone, setShowDone] = useState(false);
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // выбор держится до перезагрузки
    }
  };
  // открытый пункт: задача или этап - в окне поверх плана
  const [opened, setOpened] = useState<{ kind: 'task' | 'stage'; id: string }>();
  const setOpenTask = (id: string) => setOpened({ kind: 'task', id });
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
  const task = opened?.kind === 'task' ? tasks.data?.find((t) => t.id === opened.id) : undefined;
  const stageSong =
    opened?.kind === 'stage'
      ? songs.data?.find((s) => stagesOf(s).some((x) => x.id === opened.id))
      : undefined;
  const openStage = stageSong ? stagesOf(stageSong).find((x) => x.id === opened?.id) : undefined;
  const close = (o: boolean) => !o && setOpened(undefined);

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
      <Segmented
        label="Что показать"
        options={VIEWS}
        value={view}
        onChange={setView}
        className="-mt-2 mb-6 w-full ring-1 ring-border/70 sm:w-72 dark:ring-border/40"
      />
      {view === 'content' && (
        <ContentPlan projectId={projectId} meId={me?.id} mine={mine} canWork={access.work} />
      )}
      <div className={cn('flex flex-col gap-8', view === 'content' && 'hidden')}>
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
                    onOpen={(kind, id) => setOpened({ kind, id })}
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
      {task && <TaskDialog task={task} canWork={access.work} open onOpenChange={close} />}
      {openStage && stageSong && (
        <StageDialog
          stage={openStage}
          song={stageSong}
          projectId={projectId}
          canWork={access.work}
          open
          onOpenChange={close}
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
  onOpen,
}: {
  item: PlanItem;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: (kind: 'task' | 'stage', id: string) => void;
}) {
  if (item.kind === 'task') {
    return (
      <TaskRow
        task={item.task}
        bucket={bucket}
        projectId={projectId}
        canWork={canWork}
        onOpen={() => onOpen('task', item.id)}
      />
    );
  }
  return (
    <StageRow
      item={item}
      bucket={bucket}
      projectId={projectId}
      canWork={canWork}
      onOpen={() => onOpen('stage', item.id)}
    />
  );
}

// круглая отметка "сделано": сначала зачёркивание, через мгновение пункт уходит
function DoneCheck({
  checked,
  label,
  disabled,
  onDone,
  className,
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onDone: (done: boolean) => void;
  className?: string;
}) {
  return (
    // зона нажатия больше самой отметки: у Checkbox есть невидимое поле вокруг (after:)
    <span className={cn('-m-2 flex size-10 shrink-0 items-center justify-center', className)}>
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
  const assignees = (task.assignees ?? []).flatMap((id) => people.get(id) ?? []);
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
          <MentionText text={task.title} />
        </span>
        {song && (
          <span className="flex items-center gap-1 truncate text-xs text-dim">
            <Disc3 className="size-3" />
            {song.title}
          </span>
        )}
      </button>
      {!task.done && <Due due={task.due ?? ''} time={task.time ?? ''} bucket={bucket} />}
      <AvatarStack users={assignees} />
    </div>
  );
}

function StageRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpen,
}: {
  item: PlanStage;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: () => void;
}) {
  const client = useQueryClient();
  const people = usePeople(projectId);
  const { stage, song } = item;
  const [open, setOpen] = useState(false);
  const [leaving, leave] = useLeaving();
  const subs = stage.substeps ?? [];
  const assignees = item.assignees.flatMap((id) => people.get(id) ?? []);
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
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
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
        </button>
        <Due due={item.due} time={item.time} bucket={bucket} />
        <AvatarStack users={assignees} />
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
                  <MentionText text={x.title} />
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
  const people = useMentionPeople(projectId);
  const mentions = useMentions({ ref: input, value: title, setValue: setTitle, people });

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
        // упомянутые в названии - исполнители, "мне" - ещё и я
        assignees: [...new Set([...(mine ? [meId] : []), ...mentionedIds(title, people)])],
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
          onSelect={mentions.sync}
          onKeyDown={(e) => {
            mentions.onKeyDown(e);
          }}
          className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-11 dark:bg-transparent"
        />
        {mentions.menu}
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
  const people = useMentionPeople(task.project);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const mentions = useMentions({ ref: titleRef, value: title, setValue: setTitle, people });
  // новые упомянутые в названии становятся исполнителями
  const commitTitle = () => {
    setEditingTitle(false);
    const t = title.trim();
    if (!t || t === task.title) {
      setTitle(task.title);
      return;
    }
    const current = task.assignees ?? [];
    const added = mentionedIds(t, people).filter((id) => !current.includes(id));
    save(added.length > 0 ? { title: t, assignees: [...current, ...added] } : { title: t });
  };
  const bucket = bucketOf(task.due ?? '', new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Задача</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <DoneCheck
              checked={task.done === true}
              label="Выполнено"
              disabled={!canWork}
              onDone={(done) => save({ done })}
              className="m-0 size-8"
            />
            {!editingTitle && (
              <button
                type="button"
                disabled={!canWork}
                onClick={() => {
                  setEditingTitle(true);
                  requestAnimationFrame(() => titleRef.current?.focus());
                }}
                className="min-w-0 flex-1 cursor-text rounded-lg px-1.5 text-left text-lg leading-8 font-medium text-pretty transition-colors hover:bg-groove/40 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <MentionText text={task.title} />
              </button>
            )}
            <label htmlFor="task-title" className="sr-only">
              Название
            </label>
            <textarea
              ref={titleRef}
              id="task-title"
              rows={1}
              maxLength={300}
              hidden={!editingTitle}
              disabled={!canWork}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onSelect={mentions.sync}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (mentions.onKeyDown(e)) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="field-sizing-content min-w-0 flex-1 resize-none rounded-lg bg-transparent px-1.5 py-0 text-left text-lg leading-8 font-medium outline-none transition-colors hover:bg-groove/40 focus:bg-groove/50 disabled:opacity-100 disabled:hover:bg-transparent"
            />
            {mentions.menu}
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
              onChange={(v) => save(v ? { due: v } : { due: '', time: '' })}
            />
          </PropRow>
          {task.due && (
            <PropRow label="Время">
              <TimeField
                id="task-time"
                disabled={!canWork}
                value={task.time ?? ''}
                onChange={(time) => save({ time })}
              />
            </PropRow>
          )}
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={task.project}
              value={task.assignees ?? []}
              disabled={!canWork}
              onChange={(assignees) => save({ assignees })}
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

// Этап из плана: статус, кто делает, срок и подэтапы - не уходя со страницы плана.
function StageDialog({
  stage,
  song,
  projectId,
  canWork,
  open,
  onOpenChange,
}: {
  stage: SongStage;
  song: Song;
  projectId: string;
  canWork: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const save = (patch: StagePatch) =>
    void updateStage(client, song.id, stage.id, patch).catch(() =>
      toast.error('Не сохранилось: проверьте соединение'),
    );
  const subs = stage.substeps ?? [];
  const late =
    stage.status !== 'done' &&
    stage.status !== 'skipped' &&
    bucketOf(stage.deadline ?? '', new Date()) === 'overdue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-4 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center">
              <StatusDot status={stage.status} />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg leading-8 font-medium text-pretty">
                {stage.title}
              </DialogTitle>
              <p className="text-sm text-dim">{song.title}</p>
            </div>
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Статус">
            <StageStatusPicker
              value={stage.status}
              readOnly={!canWork}
              onChange={(status) => save({ status })}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={projectId}
              value={stage.assignees ?? []}
              disabled={!canWork}
              onChange={(assignees) => save({ assignees })}
            />
          </PropRow>
          <PropRow label="Срок">
            <DateField
              quiet
              disabled={!canWork}
              value={stage.deadline ?? ''}
              danger={late}
              placeholder="Без срока"
              onChange={(deadline) => save(deadline ? { deadline } : { deadline: '', time: '' })}
            />
          </PropRow>
          {stage.deadline && (
            <PropRow label="Время">
              <TimeField
                disabled={!canWork}
                value={stage.time ?? ''}
                onChange={(time) => save({ time })}
              />
            </PropRow>
          )}
        </div>
        {(canWork || subs.length > 0) && (
          <SubstepsEditor
            idPrefix={`plan-${stage.id}`}
            projectId={projectId}
            checkable
            readOnly={!canWork}
            items={subs}
            onChange={(items) =>
              save({
                substeps: items.map(
                  (x): Substep => ({ id: x.id, title: x.title, done: x.done === true }),
                ),
              })
            }
          />
        )}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" className="-ml-2 text-dim" asChild>
            <Link
              to="/p/$projectId/songs/$songId/stages/$stageId"
              params={{ projectId, songId: song.id, stageId: stage.id }}
            >
              Открыть этап
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
