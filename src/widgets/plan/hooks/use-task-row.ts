import { toast } from 'sonner';
import { getPeopleById, useProjectPeople } from '@/entities/project';
import { songsQuery } from '@/entities/song';
import type { Task } from '@/entities/task';
import { updateTask } from '@/entities/task';
import { getErrorText } from '@/shared/api';
import { SAVE_FAILED } from '@/shared/constants';
import { useLeaving } from '@/shared/hooks';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import type { UseTaskRowResult } from '../types/task-row';

/** Строка задачи: песня, исполнители и отметка "сделано" с задержкой ухода */
export function useTaskRow(task: Task, projectId: string): UseTaskRowResult {
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
