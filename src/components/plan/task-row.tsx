import { Disc3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { MentionText } from '@/components/mentions';
import { AvatarStack } from '@/components/people-picker';
import { Due } from '@/components/plan-bits';
import { DoneCheck } from '@/components/plan/done-check';
import { useLeaving } from '@/hooks/use-leaving';
import { getErrorText, SAVE_FAILED } from '@/lib/errors';
import type { Song, Task, User } from '@/lib/model';
import { getPeopleById, useProjectPeople } from '@/lib/people';
import type { Bucket } from '@/lib/plan';
import { songsQuery } from '@/lib/queries';
import { updateTask } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/** Пропсы задачи в списке плана */
interface TaskRowProps {
  task: Task;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать задачу */
  canWork: boolean;
  /** Открыть окно задачи */
  onOpen: () => void;
}

/** Данные и действия строки задачи */
interface UseTaskRowResult {
  /** Песня задачи, если указана и уже загружена */
  song: Song | undefined;
  assignees: User[];
  isLeaving: boolean;
  /** Отметка "сделано" стоит: задача сделана или уже уходит из списка */
  isChecked: boolean;
  onDoneChange: (isDone: boolean) => void;
}

/** Строка задачи: песня, исполнители и отметка "сделано" с задержкой ухода */
function useTaskRow(task: Task, projectId: string): UseTaskRowResult {
  const client = useQueryClient();
  const people = getPeopleById(useProjectPeople(projectId));
  const songs = useQuery(songsQuery(projectId));
  const song = songs.data?.find((projectSong) => projectSong.id === task.song);
  const assignees = (task.assignees ?? []).flatMap(
    (userId) => people.get(userId) ?? []
  );
  const { isLeaving, leave } = useLeaving();
  const isChecked = task.done !== isLeaving;

  const onDoneChange = (isDone: boolean): void => {
    const handleSave = (): void => {
      void updateTask(client, task, { done: isDone }).catch(
        (error: unknown) => {
          toast.error(getErrorText(error, SAVE_FAILED));
        }
      );
    };

    if (isDone) {
      leave(handleSave);

      return;
    }

    handleSave();
  };

  return { song, assignees, isLeaving, isChecked, onDoneChange };
}

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
