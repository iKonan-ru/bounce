import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { BucketedSections } from '@/components/bucketed-sections';
import { useProjectCrumbs } from '@/components/crumbs';
import { Loading } from '@/components/loading';
import { EmptyState, PageHeader } from '@/components/page';
import { PlanRow } from '@/components/plan/plan-row';
import { StageDialog } from '@/components/plan/stage-dialog';
import { TaskComposer } from '@/components/plan/task-composer';
import { TaskDialog } from '@/components/plan/task-dialog';
import { TaskRow } from '@/components/plan/task-row';
import { ContentPlan } from '@/components/posts/content-plan';
import { Segmented } from '@/components/segmented';
import { useAccess } from '@/lib/access';
import { useMe } from '@/lib/auth';
import { stagesOf } from '@/lib/model';
import { doneTasks, groupPlan, planItems } from '@/lib/plan';
import { songsQuery, tasksQuery } from '@/lib/queries';
import { useStoredChoice } from '@/lib/stored-choice';
import { cn } from '@/lib/utils';

type Who = 'all' | 'mine';
// дела (этапы и задачи) или контент-план (публикации)
type View = 'tasks' | 'content';
const VIEW_KEY = 'bounce.plan.view';
const VIEWS: { value: View; label: string }[] = [
  { value: 'tasks', label: 'Дела' },
  { value: 'content', label: 'Контент' },
];
const parseView = (raw: string | null): View => (raw === 'content' ? 'content' : 'tasks');
const WHO_KEY = 'bounce.plan.who';
const WHO: { value: Who; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'mine', label: 'Мои' },
];
const parseWho = (raw: string | null): Who => (raw === 'mine' ? 'mine' : 'all');

export function PlanPage() {
  const { projectId } = useParams({ from: '/app/p/$projectId/plan' });
  const me = useMe();
  const access = useAccess(projectId);
  const crumbs = useProjectCrumbs(projectId);
  const songs = useQuery(songsQuery(projectId));
  const tasks = useQuery(tasksQuery(projectId));
  const [who, setWho] = useStoredChoice(WHO_KEY, parseWho, 'all');
  const [view, setView] = useStoredChoice(VIEW_KEY, parseView, 'tasks');
  // открытый пункт: задача или этап - в окне поверх плана
  const [opened, setOpened] = useState<{ kind: 'task' | 'stage'; id: string }>();
  const setOpenTask = (id: string) => setOpened({ kind: 'task', id });

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
        {access.work && me && <TaskComposer projectId={projectId} meId={me.id} />}
        {loading && <Loading className="h-40 rounded-xl" />}
        {!loading && groups.length === 0 && done.length === 0 && (
          <EmptyState>{who === 'mine' ? 'На вас пока ничего' : 'Пока пусто'}</EmptyState>
        )}
        <BucketedSections
          groups={groups}
          renderItem={(item, bucket) => (
            <PlanRow
              item={item}
              bucket={bucket}
              projectId={projectId}
              canWork={access.work}
              onOpen={(kind, id) => setOpened({ kind, id })}
            />
          )}
          done={done}
          doneLabel="Выполнено"
          renderDone={(t) => (
            <TaskRow
              task={t}
              bucket="none"
              projectId={projectId}
              canWork={access.work}
              onOpen={() => setOpenTask(t.id)}
            />
          )}
        />
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
