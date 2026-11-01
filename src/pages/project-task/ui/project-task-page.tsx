import type { ReactNode } from 'react';
import type { TaskStage } from '@/entities/project-task';
import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import { Meter, MeterSize, getSongProgress } from '@/entities/song';
import { AddRow } from '@/features/mentions';
import { GROUP_ROWS } from '@/shared/constants';
import {
  PageHeader,
  Section,
  Columns,
  Loading,
  SortableList,
} from '@/shared/ui';
import { NotesFeed } from '@/widgets/notes';
import { useParams } from '@tanstack/react-router';
import { useProjectTaskPage } from '../hooks/use-project-task-page';
import { TaskStageRow } from './task-stage-row';

/** Задача, ее этапы и текстовые заметки. */
export function ProjectTaskPage(): ReactNode {
  const { projectId: routeProjectId, taskId } = useParams({
    from: '/app/p/$projectId/tasks/$taskId',
  });
  const state = useProjectTaskPage(routeProjectId, taskId);
  const { projectId, stages, canEdit } = state;

  if (state.isPending) {
    return <Loading className="h-40 rounded-xl" />;
  }

  if (state.isError) {
    return <p className="text-led-red">Раздел не загрузился.</p>;
  }

  if (!state.task) {
    return <p className="text-led-red">Задача не найдена.</p>;
  }

  const progress = getSongProgress(stages);
  const renderStage = (stage: TaskStage, handle: ReactNode): ReactNode => (
    <TaskStageRow
      stage={stage}
      projectId={projectId}
      canEdit={canEdit}
      handle={handle}
      people={state.people}
    />
  );
  const main = (
    <Section
      title="Этапы"
      action={
        stages.length > 0 && (
          <span className="text-sm text-dim tabular-nums">
            {progress.done} из {progress.total}
          </span>
        )
      }
    >
      <div className={GROUP_ROWS}>
        {stages.length > 0 && (
          <div className="px-4 py-3.5">
            <Meter stages={stages} size={MeterSize.Large} />
          </div>
        )}
        <SortableList
          className="divide-y divide-border/70 dark:divide-border/50"
          handleClassName="mr-1 h-12 w-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100"
          items={stages}
          disabled={!canEdit}
          onReorder={state.onReorder}
        >
          {renderStage}
        </SortableList>
        {canEdit && (
          <AddRow
            id="new-task-stage"
            label="Добавить этап"
            onAdd={state.onStageAdd}
            isBusy={state.isAdding}
          />
        )}
        {!canEdit && stages.length === 0 && (
          <p className="px-4 py-3 text-sm text-dim">Этапов нет</p>
        )}
      </div>
    </Section>
  );
  const side = (
    <Section title="Заметки">
      <NotesFeed
        scope={{ project: projectId, other: true, project_task: taskId }}
      />
    </Section>
  );

  const edit = canEdit
    ? {
        link: {
          to: '/p/$projectId/tasks/$taskId/edit' as const,
          params: { projectId, taskId },
        },
        label: 'Настройки задачи',
      }
    : undefined;

  return (
    <>
      <PageHeader
        crumbs={state.crumbs}
        title={state.task.title}
        edit={edit}
        meta={
          TASK_STATUS_OPTIONS.find(
            (option) => option.value === state.task?.status
          )?.label
        }
      />
      <Columns main={main} side={side} />
    </>
  );
}
