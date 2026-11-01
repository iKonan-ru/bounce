import { Plus, Check, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ProjectTask } from '@/entities/project-task';
import { NewProjectTaskDialog } from '@/features/create-project-task';
import { GROUP_ROWS } from '@/shared/constants';
import {
  PageActions,
  FilterBar,
  Button,
  Loading,
  SortableList,
  EmptyState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import {
  TABLE_COLUMNS,
  ORDER_PRESS_DELAY_MS,
} from '../constants/project-tasks';
import { useProjectTasksPage } from '../hooks/use-project-tasks-page';
import { ProjectTaskRow } from './project-task-row';

/** Карточки задач проекта */
export function ProjectTasksPage(): ReactNode {
  const {
    projectId,
    tasks,
    stages,
    visibleTasks,
    filter,
    filterCounts,
    onFilterSelect,
    isOrdering,
    canOrder,
    listRef,
    orderToggleRef,
    onOrderToggle,
    canEdit,
    isPending,
    isError,
    isEnabled,
    isCreating,
    onCreate,
    onClose,
    onReorder,
  } = useProjectTasksPage();
  const renderRow = (task: ProjectTask): ReactNode => (
    <ProjectTaskRow
      task={task}
      stages={stages.filter((stage) => stage.project_task === task.id)}
      isOrdering={isOrdering}
      projectId={projectId}
    />
  );

  if (isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (isError) {
    return <p className="text-led-red">Задачи не загрузились.</p>;
  }

  if (!isEnabled) {
    return <p className="text-dim">Раздел "Задачи" не включен.</p>;
  }

  return (
    <>
      <PageActions>
        {canEdit && (
          <Button
            className="max-sm:px-2.5"
            onClick={onCreate}
            disabled={isPending || isError}
          >
            <Plus data-icon="inline-start" />
            Новая задача
          </Button>
        )}
      </PageActions>
      {tasks.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              <FilterBar>
                {filterCounts.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isOrdering}
                    aria-pressed={filter === option.value}
                    data-selected={filter === option.value}
                    onClick={() => onFilterSelect(option.value)}
                    className={cn(
                      'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:opacity-40',
                      filter === option.value
                        ? 'bg-groove font-medium text-ink'
                        : 'text-dim hover:bg-groove/50 hover:text-ink'
                    )}
                  >
                    {option.label}
                    <span className="text-xs text-dim tabular-nums">
                      {option.count}
                    </span>
                  </button>
                ))}
              </FilterBar>
            </div>
            {canOrder && (
              <Button
                ref={orderToggleRef}
                size="sm"
                variant={isOrdering ? 'default' : 'ghost'}
                aria-pressed={isOrdering}
                aria-label={isOrdering ? 'Готово' : 'Порядок'}
                title={isOrdering ? 'Готово' : 'Порядок'}
                onClick={onOrderToggle}
                className="h-8 shrink-0 gap-1.5 max-sm:w-8 max-sm:px-0 sm:px-2.5"
              >
                {isOrdering ? <Check /> : <ArrowUpDown />}
                <span className="max-sm:hidden">
                  {isOrdering ? 'Готово' : 'Порядок'}
                </span>
              </Button>
            )}
          </div>
          {visibleTasks.length === 0 && (
            <EmptyState>Таких задач нет</EmptyState>
          )}
          <div
            aria-hidden="true"
            className={cn('hidden px-4 py-2 text-xs text-dim', TABLE_COLUMNS)}
          >
            <span>Задача</span>
            <span>Статус</span>
            <span>Прогресс</span>
          </div>
          <div ref={listRef}>
            {isOrdering ? (
              <SortableList
                items={visibleTasks}
                onReorder={onReorder}
                isWhole
                pressDelay={ORDER_PRESS_DELAY_MS}
                className={cn(
                  GROUP_ROWS,
                  'ring-2 ring-ring/40 dark:ring-ring/50'
                )}
              >
                {renderRow}
              </SortableList>
            ) : (
              <ul className={GROUP_ROWS}>
                {visibleTasks.map((task) => (
                  <li key={task.id}>{renderRow(task)}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {!isError && tasks.length === 0 && (
        <EmptyState
          action={
            canEdit && (
              <Button variant="secondary" onClick={onCreate}>
                <Plus data-icon="inline-start" />
                Новая задача
              </Button>
            )
          }
        >
          Задач пока нет
        </EmptyState>
      )}
      {isCreating && canEdit && (
        <NewProjectTaskDialog projectId={projectId} onClose={onClose} />
      )}
    </>
  );
}
