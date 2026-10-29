import type { ReactNode } from 'react';
import type { PlanItem } from '@/lib/plan';
import { PlanItemKind } from '@/lib/plan';
import type { Bucket } from '@/shared/types';
import { StageRow } from './stage-row';
import { TaskRow } from './task-row';

/** Пропсы строки плана */
interface PlanRowProps {
  item: PlanItem;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать и править */
  canWork: boolean;
  /** Открыть окно пункта плана */
  onOpen: (kind: PlanItemKind, id: string) => void;
}

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
