import { toast } from 'sonner';
import { useProjectPeople, PeopleKind } from '@/entities/project';
import type { Song } from '@/entities/song';
import { songsQuery } from '@/entities/song';
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
import type { MenuOption } from '@/shared/types';
import { Bucket } from '@/shared/types';
import { getMentionedIds, getBucket } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { NO_SONG } from '../constants/task-dialog';
import type { UseTaskDialogResult } from '../types/task-dialog';

/** Песня как вариант выбора */
function convertSongToOption(song: Song): MenuOption<string> {
  return { value: song.id, label: song.title };
}

/** Окно задачи: правки сразу в кэше и на сервере, удаление, новые исполнители из упоминаний */
export function useTaskDialog(
  task: Task,
  onOpenChange: (open: boolean) => void
): UseTaskDialogResult {
  const client = useQueryClient();
  const songs = useQuery(songsQuery(task.project));
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
  const onSongChange = (songId: string): void => {
    if (songId === NO_SONG) {
      save({ song: '' });

      return;
    }

    save({ song: songId });
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
  const projectSongs = songs.data ?? [];
  const hasSongs = projectSongs.length > 0;
  const songOptions: MenuOption<string>[] = [
    ...projectSongs.map(convertSongToOption),
    { value: NO_SONG, label: 'Без песни', isSeparated: hasSongs },
  ];

  return {
    isDone: task.done === true,
    isOverdue,
    due,
    assignees: task.assignees ?? [],
    songValue: task.song || NO_SONG,
    songOptions,
    isDeleting: removeTask.isPending,
    onDoneChange,
    onTitleCommit,
    onDueChange,
    onAssigneesChange,
    onSongChange,
    onDeleteConfirm,
    onDoneClick,
  };
}
