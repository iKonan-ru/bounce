import { Plus, SlidersHorizontal, LayoutList, ArrowLeft } from 'lucide-react';
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
  Button,
} from '@/shared/ui';
import { TaskComposer } from '@/widgets/plan';
import { Link } from '@tanstack/react-router';
import { MY_PLAN_VIEWS, MY_PLAN_SCOPES } from '../constants/my-plan';
import { useMyPlan } from '../hooks/use-my-plan';
import { MyPlanView, MyPlanScope } from '../types/my-plan';
import type { MyPlanEntry } from '../types/my-plan';
import { MyPlanComposer } from './my-plan-composer';
import { MyPlanDialog } from './my-plan-dialog';
import { MyPlanRow } from './my-plan-row';
import { MyProjectRow } from './my-project-row';

/** План личного пространства, проекта или обзор задач */
export function MyPlanPage(): ReactNode {
  const state = useMyPlan();
  const renderItem = (entry: MyPlanEntry, bucket: Bucket): ReactNode => (
    <MyPlanRow
      entry={entry}
      bucket={bucket}
      onOpen={state.onOpen}
      showProject={state.isOverview && !state.projectId}
    />
  );
  const renderDone = (entry: MyPlanEntry): ReactNode =>
    renderItem(entry, Bucket.None);
  const isProjects = state.isOverview && state.view === MyPlanView.Projects;
  const isEmpty = isProjects
    ? state.renderData.length === 0
    : state.groups.length === 0 && state.done.length === 0;
  const doneLabel = 'Завершено';
  const createAction = state.canCreate ? (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Добавить в план"
      aria-expanded={state.isComposerOpen}
      onClick={state.onToggleComposer}
    >
      <Plus className="size-5" />
    </Button>
  ) : undefined;

  return (
    <div className="max-w-3xl">
      <PageHeader
        crumbs={state.crumbs}
        title={state.title}
        actions={
          <>
            {!state.isOverview && (
              <Button variant="ghost" asChild>
                <Link to="/plan/overview">
                  <LayoutList className="size-4" />
                  Обзор
                </Link>
              </Button>
            )}
            {state.isOverview && (
              <Button variant="ghost" size="icon" asChild>
                <Link
                  {...(state.returnProjectId
                    ? {
                        to: '/p/$projectId/plan',
                        params: { projectId: state.returnProjectId },
                      }
                    : { to: '/plan' })}
                  aria-label="Вернуться к плану"
                  title="Вернуться к плану"
                >
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
            )}
            {createAction}
          </>
        }
      />
      <div className="flex flex-col gap-6">
        {!state.isOverview && (
          <div className="md:hidden">
            <MenuSelect
              label="Пространство"
              align="start"
              value={state.projectId}
              options={state.navigation.projectOptions}
              onChange={state.navigation.onProjectChange}
            />
          </div>
        )}
        {!state.isPersonal && (
          <Segmented
            label="Чьи задачи"
            options={MY_PLAN_SCOPES}
            value={state.scope}
            onChange={state.setScope}
            className="w-full sm:w-80"
          />
        )}
        {!state.isPersonal && (
          <div className="flex min-w-0 items-center justify-between gap-3">
            {state.isOverview && (
              <MenuSelect
                label="Пространство"
                align="start"
                value={state.projectId}
                options={state.projectOptions}
                onChange={state.setProject}
                className="max-w-full"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Фильтры"
              aria-expanded={state.isFiltersOpen}
              onClick={state.onToggleFilters}
            >
              <SlidersHorizontal className="size-4" />
              {state.hasActiveFilters && (
                <span className="size-1.5 rounded-full bg-ink" />
              )}
            </Button>
          </div>
        )}
        {!state.isPersonal && state.isFiltersOpen && (
          <div className="flex flex-wrap gap-3 rounded-xl bg-groove/50 p-3">
            <MenuSelect
              label="Содержимое"
              align="start"
              value={state.view}
              options={
                state.isOverview
                  ? MY_PLAN_VIEWS
                  : MY_PLAN_VIEWS.filter(
                      (option) => option.value !== MyPlanView.Projects
                    )
              }
              onChange={state.setView}
            />
            <MenuSelect
              label="Направление"
              align="start"
              value={state.direction}
              options={CONTENT_DIRECTION_OPTIONS}
              onChange={state.setDirection}
            />
            {state.scope === MyPlanScope.All && (
              <MenuSelect
                label="Исполнитель"
                align="start"
                value={state.assignee}
                options={state.assigneeOptions}
                onChange={state.setAssignee}
              />
            )}
          </div>
        )}
        {state.isComposerOpen &&
          state.meId &&
          (state.isPersonal ? (
            <TaskComposer projectId="" meId={state.meId} />
          ) : (
            <MyPlanComposer
              isOverview={state.isOverview}
              projects={state.writableProjects}
              projectId={state.projectId}
              meId={state.meId}
            />
          ))}
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
              {isProjects
                ? 'Нет доступных проектов'
                : 'Нет задач по выбранным фильтрам'}
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
