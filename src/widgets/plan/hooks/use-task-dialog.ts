import { toast } from 'sonner';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type { Task, TaskPatch } from '@/entities/task';
import { updateTask } from '@/entities/task';
import {
  getErrorText,
  getCollection,
  pb,
  Collections,
  queryKeys,
} from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { Bucket } from '@/shared/types';
import { getMentionedIds, getBucket } from '@/shared/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { UseTaskDialogResult } from '../types/task-dialog';
import { getTaskMediaPatch } from '../utils/task-media';
import { useTaskMedia } from './use-task-media';

/** Окно задачи: правки сразу в кэше и на сервере, удаление, новые исполнители из упоминаний */
export function useTaskDialog(
  task: Task,
  onOpenChange: (open: boolean) => void
): UseTaskDialogResult {
  const client = useQueryClient();
  const media = useTaskMedia(task.project, task);
  const workers = useProjectPeople(task.project, PeopleKind.Workers);

  const save = (patch: TaskPatch): void => {
    void updateTask(client, task, patch).catch((error: unknown) => {
      toast.error(getErrorText(error, SAVE_FAILED));
    });
  };
  const removeTask = useMutation({
    mutationFn: () => getCollection(pb, Collections.Tasks).delete(task.id),
    onSuccess: async () => {
      onOpenChange(false);
      await client.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (error) => {
      toast.error(
        getErrorText(error, 'Задача не удалена: проверьте соединение')
      );
    },
  });

  // новые упомянутые в названии становятся исполнителями
  const onTitleCommit = (title: string): void => {
    const currentAssignees = task.assignees ?? [];
    const addedAssignees = getMentionedIds(title, workers).filter(
      (userId) => !currentAssignees.includes(userId)
    );

    if (addedAssignees.length > 0) {
      save({ title, assignees: [...currentAssignees, ...addedAssignees] });

      return;
    }

    save({ title });
  };
  const onDoneChange = (isDone: boolean): void => {
    save({ done: isDone });
  };
  const onDueChange = (due: string): void => {
    save({ due });
  };
  const onAssigneesChange = (assignees: string[]): void => {
    save({ assignees });
  };
  const onMediaChange = (value: string): void => {
    save(getTaskMediaPatch(value));
  };
  const onDeleteConfirm = (): void => {
    removeTask.mutate();
  };
  const onDoneClick = (): void => {
    onOpenChange(false);
  };

  const due = task.due ?? '';
  const isOverdueBucket = getBucket(due, new Date()) === Bucket.Overdue;
  const isOverdue = isOverdueBucket && !task.done;

  return {
    isDone: task.done === true,
    isOverdue,
    due,
    assignees: task.assignees ?? [],
    mediaValue: media.value,
    mediaOptions: media.options,
    hasMedia: media.hasMedia,
    isDeleting: removeTask.isPending,
    onDoneChange,
    onTitleCommit,
    onDueChange,
    onAssigneesChange,
    onMediaChange,
    onDeleteConfirm,
    onDoneClick,
  };
}
