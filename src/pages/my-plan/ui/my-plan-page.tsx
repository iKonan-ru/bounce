import type { ReactNode } from 'react';
import { CONTENT_DIRECTION_OPTIONS, GROUP_ROWS } from '@/shared/constants';
import { Bucket } from '@/shared/types';
import {
  PageHeader,
  Segmented,
  MenuSelect,
  BucketedSections,
  EmptyState,
  Loading,
} from '@/shared/ui';
import { MY_PLAN_VIEWS } from '../constants/my-plan';
import { useMyPlan } from '../hooks/use-my-plan';
import { MyPlanView } from '../types/my-plan';
import type { MyPlanEntry } from '../types/my-plan';
import { MyPlanDialog } from './my-plan-dialog';
import { MyPlanRow } from './my-plan-row';
import { MyProjectRow } from './my-project-row';

/** Личный план за пределами отдельного проекта */
export function MyPlanPage(): ReactNode {
  const state = useMyPlan();
  const renderItem = (entry: MyPlanEntry, bucket: Bucket): ReactNode => (
    <MyPlanRow entry={entry} bucket={bucket} onOpen={state.onOpen} />
  );
  const renderDone = (entry: MyPlanEntry): ReactNode =>
    renderItem(entry, Bucket.None);
  const isProjects = state.view === MyPlanView.Projects;
  const isEmpty = isProjects
    ? state.renderData.length === 0
    : state.groups.length === 0 && state.done.length === 0;
  const doneLabel =
    state.view === MyPlanView.Tasks ? 'Выполнено' : 'Опубликовано';

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={[]} title="Мой план" />
      <div className="flex flex-col gap-6">
        <Segmented
          label="Что показать"
          options={MY_PLAN_VIEWS}
          value={state.view}
          onChange={state.setView}
          className="w-full ring-1 ring-border/70 sm:w-80"
        />
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <MenuSelect
            label="Проект"
            value={state.projectId}
            options={state.projectOptions}
            onChange={state.setProject}
            className="max-w-full"
          />
          <MenuSelect
            label="Направление"
            value={state.direction}
            options={CONTENT_DIRECTION_OPTIONS}
            onChange={state.setDirection}
            className="max-w-full"
          />
        </div>
        {!state.isOnline && (
          <p role="status" className="text-sm text-dim">
            Сохраненные данные. Без сети список может быть неполным.
          </p>
        )}
        {state.isOnline && state.isError && (
          <p role="status" className="text-sm text-led-red">
            Не удалось обновить часть плана. Показаны доступные данные.
          </p>
        )}
        {state.isLoading && <Loading className="h-24 rounded-xl" />}
        {!state.isLoading &&
          !state.isError &&
          !state.isIncomplete &&
          isEmpty && (
            <EmptyState>
              {isProjects ? 'Нет доступных проектов' : 'На вас пока ничего'}
            </EmptyState>
          )}
        {isProjects ? (
          <ul className={GROUP_ROWS}>
            {state.renderData.map((data) => (
              <li key={data.project.id}>
                <MyProjectRow
                  data={data}
                  tasksCount={state.count(data.project.id, 'work')}
                  postsCount={state.count(data.project.id, 'content')}
                />
              </li>
            ))}
          </ul>
        ) : (
          <BucketedSections
            groups={state.groups}
            done={state.done}
            doneLabel={doneLabel}
            renderItem={renderItem}
            renderDone={renderDone}
          />
        )}
      </div>
      {state.opened && (
        <MyPlanDialog entry={state.opened} onClose={state.onClose} />
      )}
    </div>
  );
}
