import { StageRow } from '@/components/plan/stage-row';
import { TaskRow } from '@/components/plan/task-row';
import type { Bucket, PlanItem } from '@/lib/plan';

// строка плана: задача или этап песни
export function PlanRow({
  item,
  bucket,
  projectId,
  canWork,
  onOpen,
}: {
  item: PlanItem;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: (kind: 'task' | 'stage', id: string) => void;
}) {
  if (item.kind === 'task') {
    return (
      <TaskRow
        task={item.task}
        bucket={bucket}
        projectId={projectId}
        canWork={canWork}
        onOpen={() => onOpen('task', item.id)}
      />
    );
  }
  return (
    <StageRow
      item={item}
      bucket={bucket}
      projectId={projectId}
      canWork={canWork}
      onOpen={() => onOpen('stage', item.id)}
    />
  );
}
