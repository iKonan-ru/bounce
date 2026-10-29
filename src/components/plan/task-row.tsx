import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Disc3 } from 'lucide-react';
import { toast } from 'sonner';
import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { DoneCheck, useLeaving } from '@/components/plan/done-check';
import { Due } from '@/components/plan-bits';
import { errorText, SAVE_FAILED } from '@/lib/errors';
import type { Task } from '@/lib/model';
import { peopleById, useProjectPeople } from '@/lib/people';
import type { Bucket } from '@/lib/plan';
import { songsQuery } from '@/lib/queries';
import { updateTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';

// Задача в списке плана: отметка "сделано", название, песня, срок, кто делает.
export function TaskRow({
  task,
  bucket,
  projectId,
  canWork,
  onOpen,
}: {
  task: Task;
  bucket: Bucket;
  projectId: string;
  canWork: boolean;
  onOpen: () => void;
}) {
  const client = useQueryClient();
  const people = peopleById(useProjectPeople(projectId));
  const songs = useQuery(songsQuery(projectId));
  const song = task.song ? songs.data?.find((s) => s.id === task.song) : undefined;
  const assignees = (task.assignees ?? []).flatMap((id) => people.get(id) ?? []);
  const [leaving, leave] = useLeaving();
  const checked = task.done !== leaving;

  const toggle = (done: boolean) => {
    const run = () =>
      void updateTask(client, task, { done }).catch((e) => toast.error(errorText(e, SAVE_FAILED)));
    if (done) leave(run);
    else run();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-opacity duration-300',
        leaving && 'opacity-50',
      )}
    >
      <DoneCheck checked={checked} label={task.title} disabled={!canWork} onDone={toggle} />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-9 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <span
          className={cn(
            'text-pretty transition-colors',
            checked && 'text-dim line-through decoration-dim/60',
          )}
        >
          <MentionText text={task.title} />
        </span>
        {song && (
          <span className="flex items-center gap-1 truncate text-xs text-dim">
            <Disc3 className="size-3" />
            {song.title}
          </span>
        )}
      </button>
      {!task.done && <Due due={task.due ?? ''} bucket={bucket} />}
      <AvatarStack users={assignees} />
    </div>
  );
}
