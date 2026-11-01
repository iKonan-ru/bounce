import { ListChecks, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { TASK_STATUS_OPTIONS } from '@/entities/project-task';
import { Meter, getSongProgress, getCurrentStage } from '@/entities/song';
import { Link } from '@tanstack/react-router';
import type { ProjectTaskRowProps } from '../types/project-task';

/** Название, состояние и прогресс карточки, как в списке видео. */
export function ProjectTaskRow({
  task,
  stages,
  projectId,
  handle,
}: ProjectTaskRowProps): ReactNode {
  const progress = getSongProgress(stages);
  const currentStage = getCurrentStage(stages);
  const status = TASK_STATUS_OPTIONS.find(
    (option) => option.value === task.status
  )?.label;

  return (
    <div className="group/row flex items-center hover:bg-groove/40">
      {handle}
      <Link
        to="/p/$projectId/tasks/$taskId"
        params={{ projectId, taskId: task.id }}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 lg:py-2.5"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-groove text-dim">
          <ListChecks className="size-5" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{task.title}</span>
          <span className="block truncate text-sm text-dim">
            {[status, currentStage?.title].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {stages.length > 0 ? (
            <>
              <span className="text-xs text-dim tabular-nums">
                {progress.done}/{progress.total}
              </span>
              <span className="w-24">
                <Meter stages={stages} />
              </span>
            </>
          ) : (
            <span className="text-xs text-dim">Нет этапов</span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-dim/60" />
      </Link>
    </div>
  );
}
