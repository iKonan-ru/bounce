import type { ReactNode } from 'react';
import type { Task } from '@/entities/task';
import { Bucket } from '@/shared/types';
import {
  Segmented,
  PageHeader,
  Loading,
  EmptyState,
  BucketedSections,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { PlanItem } from '@/widgets/plan';
import {
  TaskRow,
  TaskComposer,
  PlanRow,
  TaskDialog,
  StageDialog,
} from '@/widgets/plan';
import { ContentPlan } from '@/widgets/posts';
import { SCOPE_OPTIONS, VIEW_OPTIONS } from '../constants/plan';
import { usePlanPage } from '../hooks/use-plan-page';
import type { DoneTaskRowProps, PlanComposerProps } from '../types/plan';
import { PlanView } from '../types/plan';

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
