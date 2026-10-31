import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { CONTENT_DIRECTION_OPTIONS } from '@/shared/constants';
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
import { MY_PLAN_VIEWS, MY_PLAN_SCOPES } from '../constants/my-plan';
import { useMyPlan } from '../hooks/use-my-plan';
import { MyPlanScope } from '../types/my-plan';
import type { MyPlanEntry } from '../types/my-plan';
import { MyPlanComposer } from './my-plan-composer';
import { MyPlanDialog } from './my-plan-dialog';
import { MyPlanRow } from './my-plan-row';

/** План текущего проекта */
export function MyPlanPage(): ReactNode {
  const state = useMyPlan();
  const renderItem = (entry: MyPlanEntry, bucket: Bucket): ReactNode => (
    <MyPlanRow entry={entry} bucket={bucket} onOpen={state.onOpen} />
  );
  const renderDone = (entry: MyPlanEntry): ReactNode =>
    renderItem(entry, Bucket.None);
  const isEmpty = state.groups.length === 0 && state.done.length === 0;
  const doneLabel = 'Завершено';

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={state.crumbs} title="План" />
      <div className="flex flex-col gap-6">
        <div className="md:hidden">
          <MenuSelect
            label="Проект"
            align="start"
            value={state.projectId}
            options={state.navigation.projectOptions}
            onChange={state.navigation.onProjectChange}
          />
        </div>
        {state.canCreate && state.meId && (
          <MyPlanComposer
            key={state.projectId}
            projects={state.writableProjects}
            projectId={state.projectId}
            meId={state.meId}
          />
        )}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Segmented
            label="Чьи задачи"
            options={MY_PLAN_SCOPES}
            value={state.scope}
            onChange={state.setScope}
            className="w-full sm:w-80"
          />
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
        {state.isFiltersOpen && (
          <div className="flex flex-wrap gap-3 rounded-xl bg-groove/50 p-3">
            <MenuSelect
              label="Содержимое"
              align="start"
              value={state.view}
              options={MY_PLAN_VIEWS}
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
          isEmpty && <EmptyState>Нет задач по выбранным фильтрам</EmptyState>}
        <BucketedSections
          groups={state.groups}
          done={state.done}
          doneLabel={doneLabel}
          renderItem={renderItem}
          renderDone={renderDone}
        />
      </div>
      {state.opened && (
        <MyPlanDialog entry={state.opened} onClose={state.onClose} />
      )}
    </div>
  );
}
