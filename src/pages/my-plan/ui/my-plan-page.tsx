import type { ReactNode } from 'react';
import { Bucket } from '@/shared/types';
import {
  PageHeader,
  ListFilters,
  PropRow,
  MenuSelect,
  BucketedSections,
  EmptyState,
  Loading,
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
        <ListFilters
          searchId="plan-search"
          searchLabel="Поиск по плану"
          searchValue={state.search}
          onSearchChange={state.onSearchChange}
          chips={state.chips}
          onReset={state.onResetFilters}
        >
          <PropRow label="Чьи задачи">
            <MenuSelect
              label="Чьи задачи"
              align="end"
              className="max-w-full"
              options={MY_PLAN_SCOPES}
              value={state.scope}
              onChange={state.onScopeChange}
            />
          </PropRow>
          <PropRow label="Содержимое">
            <MenuSelect
              label="Содержимое"
              align="end"
              className="max-w-full"
              value={state.view}
              options={MY_PLAN_VIEWS}
              onChange={state.setView}
            />
          </PropRow>
          <PropRow label="Направление">
            <MenuSelect
              label="Направление"
              align="end"
              className="max-w-full"
              value={state.direction}
              options={state.directionOptions}
              onChange={state.setDirection}
            />
          </PropRow>
          {state.scope === MyPlanScope.All && (
            <PropRow label="Исполнитель">
              <MenuSelect
                label="Исполнитель"
                align="end"
                className="max-w-full"
                value={state.assignee}
                options={state.assigneeOptions}
                onChange={state.setAssignee}
              />
            </PropRow>
          )}
        </ListFilters>
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
              {state.isFiltered
                ? 'Ничего не нашлось'
                : 'В плане пока нет записей'}
            </EmptyState>
          )}
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
