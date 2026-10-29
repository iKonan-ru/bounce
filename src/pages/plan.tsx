import type { ReactNode } from 'react';
import { useState } from 'react';
import { useProjectCrumbs } from '@/components/crumbs';
import { PlanRow } from '@/components/plan/plan-row';
import { StageDialog } from '@/components/plan/stage-dialog';
import { TaskComposer } from '@/components/plan/task-composer';
import { TaskDialog } from '@/components/plan/task-dialog';
import { TaskRow } from '@/components/plan/task-row';
import { ContentPlan } from '@/components/posts/content-plan';
import { useAccess } from '@/entities/project';
import type { SongStage, SongWithStages } from '@/entities/song';
import { getOrderedStages, songsQuery } from '@/entities/song';
import type { Task } from '@/entities/task';
import { tasksQuery } from '@/entities/task';
import type { PlanItem } from '@/lib/plan';
import {
  PlanItemKind,
  getPlanItems,
  groupPlanItems,
  getDoneTasks,
} from '@/lib/plan';
import { useMe, useStoredChoice } from '@/shared/hooks';
import type { Crumb, PlanGroup } from '@/shared/types';
import { Bucket } from '@/shared/types';
import {
  Segmented,
  PageHeader,
  Loading,
  EmptyState,
  BucketedSections,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

/** Чьи пункты показать */
enum PlanScope {
  /** Все пункты */
  All = 'all',
  /** Только те, где я среди исполнителей */
  Mine = 'mine',
}

/** Что показать в плане */
enum PlanView {
  /** Дела: этапы и задачи */
  Tasks = 'tasks',
  /** Контент-план: публикации */
  Content = 'content',
}

/** Вариант переключателя */
interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
}

/** Открытый пункт плана: задача или этап - в окне поверх плана */
interface OpenedItem {
  kind: PlanItemKind;
  id: string;
}

/** Открытый этап вместе с его песней */
interface OpenedStage {
  stage: SongStage;
  song: SongWithStages;
}

/** Ключ хранилища: что показать в плане */
const VIEW_STORAGE_KEY = 'bounce.plan.view';

/** Варианты переключателя "Что показать" */
const VIEW_OPTIONS: readonly ChoiceOption<PlanView>[] = [
  { value: PlanView.Tasks, label: 'Дела' },
  { value: PlanView.Content, label: 'Контент' },
];

/** Ключ хранилища: чьи пункты показать */
const SCOPE_STORAGE_KEY = 'bounce.plan.who';

/** Варианты переключателя "Чьи задачи" */
const SCOPE_OPTIONS: readonly ChoiceOption<PlanScope>[] = [
  { value: PlanScope.All, label: 'Все' },
  { value: PlanScope.Mine, label: 'Мои' },
];

/** Сохранённый вид плана; без сохранённого - дела */
function parseView(raw: string | null): PlanView {
  if (raw === PlanView.Content) {
    return PlanView.Content;
  }

  return PlanView.Tasks;
}

/** Сохранённый выбор "чьи"; без сохранённого - все */
function parseScope(raw: string | null): PlanScope {
  if (raw === PlanScope.Mine) {
    return PlanScope.Mine;
  }

  return PlanScope.All;
}

/** Открытая задача, если открыта задача */
function findOpenedTask(
  tasks: readonly Task[],
  opened: OpenedItem | undefined
): Task | undefined {
  if (opened?.kind !== PlanItemKind.Task) {
    return undefined;
  }

  return tasks.find((task) => task.id === opened.id);
}

/** Открытый этап и его песня, если открыт этап */
function findOpenedStage(
  songs: readonly SongWithStages[],
  opened: OpenedItem | undefined
): OpenedStage | undefined {
  if (opened?.kind !== PlanItemKind.Stage) {
    return undefined;
  }

  for (const song of songs) {
    const stage = getOrderedStages(song).find(
      (songStage) => songStage.id === opened.id
    );

    if (stage) {
      return { stage, song };
    }
  }

  return undefined;
}

/** Пропсы строки выполненной задачи */
interface DoneTaskRowProps {
  task: Task;
  projectId: string;
  canWork: boolean;
  /** Открыть задачу по id */
  onOpen: (id: string) => void;
}

/** Выполненная задача в списке "Выполнено" */
function DoneTaskRow({
  task,
  projectId,
  canWork,
  onOpen,
}: DoneTaskRowProps): ReactNode {
  const onRowOpen = (): void => {
    onOpen(task.id);
  };

  return (
    <TaskRow
      task={task}
      bucket={Bucket.None}
      projectId={projectId}
      canWork={canWork}
      onOpen={onRowOpen}
    />
  );
}

/** Пропсы поля новой задачи */
interface PlanComposerProps {
  projectId: string;
  meId: string | undefined;
  canWork: boolean;
}

/** Поле новой задачи: только тем, кто ведёт работу */
function PlanComposer({
  projectId,
  meId,
  canWork,
}: PlanComposerProps): ReactNode {
  if (!canWork) {
    return null;
  }

  if (!meId) {
    return null;
  }

  return <TaskComposer projectId={projectId} meId={meId} />;
}

/** Состояние и данные страницы плана */
interface UsePlanPageResult {
  projectId: string;
  crumbs: Crumb[];
  meId: string | undefined;
  canWork: boolean;
  scope: PlanScope;
  setScope: (scope: PlanScope) => void;
  isMine: boolean;
  view: PlanView;
  setView: (view: PlanView) => void;
  /** Исполнитель для фильтра "Мои"; undefined - все */
  mineId: string | undefined;
  groups: PlanGroup<PlanItem>[];
  doneTasks: Task[];
  isLoading: boolean;
  isEmpty: boolean;
  openedTask: Task | undefined;
  openedStage: OpenedStage | undefined;
  onItemOpen: (kind: PlanItemKind, id: string) => void;
  onTaskOpen: (id: string) => void;
  onDialogOpenChange: (isOpen: boolean) => void;
}

/** Пункты плана по срокам, фильтр "чьи" и открытый пункт */
function usePlanPage(): UsePlanPageResult {
  const { projectId } = useParams({ from: '/app/p/$projectId/plan' });
  const me = useMe();
  const access = useAccess(projectId);
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const tasks = useQuery(tasksQuery(projectId));
  const [scope, setScope] = useStoredChoice(
    SCOPE_STORAGE_KEY,
    parseScope,
    PlanScope.All
  );
  const [view, setView] = useStoredChoice(
    VIEW_STORAGE_KEY,
    parseView,
    PlanView.Tasks
  );
  const [opened, setOpened] = useState<OpenedItem>();

  const songList = songs.data ?? [];
  const taskList = tasks.data ?? [];
  const isMine = scope === PlanScope.Mine;
  const mineId = isMine ? me?.id : undefined;
  const items = getPlanItems(songList, taskList, mineId);
  const groups = groupPlanItems(items, new Date());
  const doneTasks = getDoneTasks(taskList, mineId);
  const isLoading = songs.isPending || tasks.isPending;
  const isNothingPlanned = groups.length === 0 && doneTasks.length === 0;
  const isEmpty = !isLoading && isNothingPlanned;

  const onItemOpen = (kind: PlanItemKind, id: string): void => {
    setOpened({ kind, id });
  };

  const onTaskOpen = (id: string): void => {
    setOpened({ kind: PlanItemKind.Task, id });
  };

  const onDialogOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setOpened(undefined);
    }
  };

  return {
    projectId,
    crumbs,
    meId: me?.id,
    canWork: access.canWork,
    scope,
    setScope,
    isMine,
    view,
    setView,
    mineId,
    groups,
    doneTasks,
    isLoading,
    isEmpty,
    openedTask: findOpenedTask(taskList, opened),
    openedStage: findOpenedStage(songList, opened),
    onItemOpen,
    onTaskOpen,
    onDialogOpenChange,
  };
}

/** План проекта: дела по срокам или контент-план */
export function PlanPage(): ReactNode {
  const {
    projectId,
    crumbs,
    meId,
    canWork,
    scope,
    setScope,
    isMine,
    view,
    setView,
    mineId,
    groups,
    doneTasks,
    isLoading,
    isEmpty,
    openedTask,
    openedStage,
    onItemOpen,
    onTaskOpen,
    onDialogOpenChange,
  } = usePlanPage();

  const isContentView = view === PlanView.Content;
  const tasksClassName = cn('flex flex-col gap-8', { hidden: isContentView });

  const renderPlanItem = (item: PlanItem, bucket: Bucket): ReactNode => (
    <PlanRow
      item={item}
      bucket={bucket}
      projectId={projectId}
      canWork={canWork}
      onOpen={onItemOpen}
    />
  );

  const renderDoneTask = (task: Task): ReactNode => (
    <DoneTaskRow
      task={task}
      projectId={projectId}
      canWork={canWork}
      onOpen={onTaskOpen}
    />
  );

  const scopeSwitch = (
    <Segmented
      label="Чьи задачи"
      options={SCOPE_OPTIONS}
      value={scope}
      onChange={setScope}
      className="w-32 ring-1 ring-border/70 dark:ring-border/40"
    />
  );

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={crumbs} title="План" actions={scopeSwitch} />
      <Segmented
        label="Что показать"
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        className="-mt-2 mb-6 w-full ring-1 ring-border/70 sm:w-72 dark:ring-border/40"
      />
      {isContentView && (
        <ContentPlan
          projectId={projectId}
          meId={meId}
          assigneeId={mineId}
          canWork={canWork}
        />
      )}
      <div className={tasksClassName}>
        <PlanComposer projectId={projectId} meId={meId} canWork={canWork} />
        {isLoading && <Loading className="h-40 rounded-xl" />}
        {isEmpty && (
          <EmptyState>
            {isMine ? 'На вас пока ничего' : 'Пока пусто'}
          </EmptyState>
        )}
        <BucketedSections
          groups={groups}
          renderItem={renderPlanItem}
          done={doneTasks}
          doneLabel="Выполнено"
          renderDone={renderDoneTask}
        />
      </div>
      {openedTask && (
        <TaskDialog
          task={openedTask}
          canWork={canWork}
          open
          onOpenChange={onDialogOpenChange}
        />
      )}
      {openedStage && (
        <StageDialog
          stage={openedStage.stage}
          song={openedStage.song}
          projectId={projectId}
          canWork={canWork}
          open
          onOpenChange={onDialogOpenChange}
        />
      )}
    </div>
  );
}
