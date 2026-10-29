import type { ReactNode } from 'react';
import { PlanItemKind } from '../types/plan';
import type { PlanRowProps } from '../types/plan-row';
import { StageRow } from './stage-row';
import { TaskRow } from './task-row';

/** Строка плана: задача или этап песни */
export function PlanRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpen,
}: PlanRowProps): ReactNode {
  const onRowOpen = (): void => {
    onOpen(item.kind, item.id);
  };

  if (item.kind === PlanItemKind.Task) {
    return (
      <TaskRow
        task={item.task}
        bucket={bucket}
        projectId={projectId}
        canWork={canWork}
        onOpen={onRowOpen}
      />
    );
  }

  return (
    <StageRow
      item={item}
      bucket={bucket}
      projectId={projectId}
      canWork={canWork}
      onOpen={onRowOpen}
    />
  );
}
