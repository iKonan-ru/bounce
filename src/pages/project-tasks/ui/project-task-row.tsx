import { ListChecks, ChevronRight, GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import { Meter, getSongProgress, getCurrentStage } from '@/entities/song';
import { cn } from '@/shared/utils';
import { Link } from '@tanstack/react-router';
import { TABLE_COLUMNS } from '../constants/project-tasks';
import type { ProjectTaskRowProps } from '../types/project-task';

/** Строка задачи в тех же колонках и режимах, что и видео */
export function ProjectTaskRow({
  task,
  stages,
  isOrdering = false,
  projectId,
}: ProjectTaskRowProps): ReactNode {
  const status = TASK_STATUS_OPTIONS.find(
    (item) => item.value === task.status
  )?.label;
  const progress = getSongProgress(stages);
  const currentStage = getCurrentStage(stages);
  const subtitle = [status, currentStage?.title].filter(Boolean).join(' · ');
  const rowClassName = cn(
    'flex min-w-0 items-center gap-3 px-4 py-3 transition-colors lg:py-2.5 hover:bg-groove/40',
    TABLE_COLUMNS,
    { 'cursor-grab active:cursor-grabbing': isOrdering }
  );
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {isOrdering && (
          <GripVertical className="-mr-1 -ml-1 size-4 shrink-0 text-dim" />
        )}
        <span className="inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-groove text-dim lg:size-10">
          <ListChecks className="size-5" strokeWidth={1.5} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{task.title}</span>
          <span className="block truncate text-sm text-dim lg:hidden">
            {subtitle}
          </span>
          {currentStage && (
            <span className="hidden truncate text-sm text-dim lg:block">
              {currentStage.title}
            </span>
          )}
        </span>
      </span>
      <span className="hidden truncate text-sm text-dim lg:block">
        {status}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 lg:w-auto lg:flex-row lg:items-center lg:gap-2">
        {stages.length > 0 ? (
          <>
            <span className="text-xs text-dim tabular-nums lg:order-2 lg:w-8 lg:text-right">
              {progress.done}/{progress.total}
            </span>
            <span className="w-24 lg:order-1 lg:w-auto lg:flex-1">
              <Meter stages={stages} />
            </span>
          </>
        ) : (
          <span className="text-xs text-dim">Нет этапов</span>
        )}
      </span>
      {!isOrdering && (
        <ChevronRight className="size-4 shrink-0 text-dim/60 lg:hidden" />
      )}
    </>
  );

  if (isOrdering) {
    return <div className={rowClassName}>{content}</div>;
  }

  return (
    <Link
      to="/p/$projectId/tasks/$taskId"
      params={{ projectId, taskId: task.id }}
      draggable={false}
      className={rowClassName}
    >
      {content}
    </Link>
  );
}
