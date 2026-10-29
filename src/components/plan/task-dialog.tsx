import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useProjectPeople, PeopleKind, PeoplePicker } from '@/entities/project';
import type { Song } from '@/entities/song';
import { songsQuery } from '@/entities/song';
import type { Task, TaskPatch } from '@/entities/task';
import { updateTask } from '@/entities/task';
import { EditableTitle } from '@/features/mentions';
import {
  getErrorText,
  getCollection,
  pb,
  Collections,
  queryKeys,
} from '@/shared/api';
import { SAVE_FAILED, GROUP_ROWS } from '@/shared/constants';
import type { MenuOption } from '@/shared/types';
import { Bucket } from '@/shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DoneCheck,
  PropRow,
  DateField,
  MenuSelect,
  ItemDialogFooter,
} from '@/shared/ui';
import { getMentionedIds, getBucket } from '@/shared/utils';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

/** Значение пункта "Без песни" в выборе песни */
const NO_SONG = 'none';

/** Пропсы окна задачи */
interface TaskDialogProps {
  task: Task;
  /** Можно править задачу */
  canWork: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Данные и действия окна задачи */
interface UseTaskDialogResult {
  /** Задача сделана */
  isDone: boolean;
  /** Срок прошёл, а задача не сделана */
  isOverdue: boolean;
  due: string;
  assignees: string[];
  /** Выбранная песня или "Без песни" */
  songValue: string;
  songOptions: MenuOption<string>[];
  isDeleting: boolean;
  onDoneChange: (isDone: boolean) => void;
  onTitleCommit: (title: string) => void;
  onDueChange: (due: string) => void;
  onAssigneesChange: (assignees: string[]) => void;
  onSongChange: (songId: string) => void;
  onDeleteConfirm: () => void;
  onDoneClick: () => void;
}

/** Песня как вариант выбора */
function convertSongToOption(song: Song): MenuOption<string> {
  return { value: song.id, label: song.title };
}

/** Окно задачи: правки сразу в кэше и на сервере, удаление, новые исполнители из упоминаний */
function useTaskDialog(
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

/** Задача целиком: название, срок, кто делает, песня; удалить */
export function TaskDialog({
  task,
  canWork,
  open,
  onOpenChange,
}: TaskDialogProps): ReactNode {
  const {
    isDone,
    isOverdue,
    due,
    assignees,
    songValue,
    songOptions,
    isDeleting,
    onDoneChange,
    onTitleCommit,
    onDueChange,
    onAssigneesChange,
    onSongChange,
    onDeleteConfirm,
    onDoneClick,
  } = useTaskDialog(task, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className="sr-only">Задача</DialogTitle>
          <div className="flex items-start gap-2 pr-8">
            <DoneCheck
              checked={isDone}
              label="Выполнено"
              disabled={!canWork}
              onDone={onDoneChange}
              className="m-0 size-8"
            />
            <EditableTitle
              id="task-title"
              label="Название"
              value={task.title}
              projectId={task.project}
              disabled={!canWork}
              onCommit={onTitleCommit}
            />
          </div>
        </DialogHeader>
        <div className={GROUP_ROWS}>
          <PropRow label="Срок">
            <DateField
              isQuiet
              id="task-due"
              disabled={!canWork}
              value={due}
              isOverdue={isOverdue}
              placeholder="Без срока"
              onChange={onDueChange}
            />
          </PropRow>
          <PropRow label="Кто делает">
            <PeoplePicker
              projectId={task.project}
              value={assignees}
              disabled={!canWork}
              onChange={onAssigneesChange}
            />
          </PropRow>
          <PropRow label="Песня">
            <MenuSelect
              label="Песня"
              value={songValue}
              isDim={!task.song}
              disabled={!canWork}
              onChange={onSongChange}
              options={songOptions}
            />
          </PropRow>
        </div>
        <ItemDialogFooter
          canWork={canWork}
          title={task.title}
          isDeleting={isDeleting}
          onDelete={onDeleteConfirm}
          onDone={onDoneClick}
        />
      </DialogContent>
    </Dialog>
  );
}
