import { Disc3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { AvatarStack } from '@/entities/project';
import { MentionText } from '@/entities/user';
import { DoneCheck, Due } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useTaskRow } from '../hooks/use-task-row';
import type { TaskRowProps } from '../types/task-row';

/** Задача в списке плана: отметка "сделано", название, песня, срок, кто делает */
export function TaskRow({
  task,
  bucket,
  projectId,
  canWork,
  onOpen,
}: TaskRowProps): ReactNode {
  const { song, assignees, isLeaving, isChecked, onDoneChange } = useTaskRow(
    task,
    projectId
  );
  const rowClassName = cn(
    'flex items-center gap-3 px-4 py-2.5 transition-opacity duration-300',
    {
      'opacity-50': isLeaving,
    }
  );
  const titleClassName = cn('text-pretty transition-colors', {
    'text-dim line-through decoration-dim/60': isChecked,
  });
  const due = task.due ?? '';

  return (
    <div className={rowClassName}>
      <DoneCheck
        checked={isChecked}
        label={task.title}
        disabled={!canWork}
        onDone={onDoneChange}
      />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <span className={titleClassName}>
          <MentionText text={task.title} />
        </span>
        {song && (
          <span className="flex items-center gap-1 truncate text-xs text-dim">
            <Disc3 className="size-3" />
            {song.title}
          </span>
        )}
      </button>
      {!task.done && <Due due={due} bucket={bucket} />}
      <AvatarStack users={assignees} />
    </div>
  );
}
