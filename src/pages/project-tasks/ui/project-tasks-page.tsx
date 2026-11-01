import { Plus } from 'lucide-react';
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
import { useProjectTasksPage } from '../hooks/use-project-tasks-page';
import { ProjectTaskRow } from './project-task-row';

/** Карточки задач на одном уровне с песнями и видео. */
export function ProjectTasksPage(): ReactNode {
  const state = useProjectTasksPage();

  if (state.isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (state.isError) {
    return <p className="text-led-red">Задачи не загрузились.</p>;
  }

  if (!state.isEnabled) {
    return <p className="text-dim">Раздел "Задачи" не включен.</p>;
  }

  const renderRow = (task: ProjectTask, handle: ReactNode): ReactNode => (
    <ProjectTaskRow
      task={task}
      stages={state.stages.filter((stage) => stage.project_task === task.id)}
      projectId={state.projectId}
      handle={handle}
    />
  );

  return (
    <>
      <PageActions>
        {state.canEdit && (
          <Button onClick={state.onCreate}>
            <Plus data-icon="inline-start" />
            Новая задача
          </Button>
        )}
      </PageActions>
      {state.tasks.length > 0 && (
        <>
          <div className="mb-3 flex gap-1 overflow-x-auto [scrollbar-width:none]">
            <FilterBar>
              {state.filterCounts.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={state.filter === option.value}
                  data-selected={state.filter === option.value}
                  onClick={() => state.onFilterSelect(option.value)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
                    state.filter === option.value
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
          <SortableList
            items={state.visibleTasks}
            disabled={!state.canEdit || state.filter !== 'all'}
            onReorder={state.onReorder}
            className={GROUP_ROWS}
            handleClassName="ml-1 w-6 shrink-0"
          >
            {renderRow}
          </SortableList>
          {state.visibleTasks.length === 0 && (
            <EmptyState>Таких задач нет</EmptyState>
          )}
        </>
      )}
      {state.tasks.length === 0 && (
        <EmptyState
          action={
            state.canEdit && (
              <Button variant="secondary" onClick={state.onCreate}>
                <Plus data-icon="inline-start" />
                Новая задача
              </Button>
            )
          }
        >
          Задач пока нет
        </EmptyState>
      )}
      {state.isCreating && state.canEdit && (
        <NewProjectTaskDialog
          projectId={state.projectId}
          onClose={state.onClose}
        />
      )}
    </>
  );
}
