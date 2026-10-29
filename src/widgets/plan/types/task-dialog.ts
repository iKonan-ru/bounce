import type { Task } from '@/entities/task';
import type { MenuOption } from '@/shared/types';

/** Пропсы окна задачи */
export interface TaskDialogProps {
  task: Task;
  /** Можно править задачу */
  canWork: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Данные и действия окна задачи */
export interface UseTaskDialogResult {
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
