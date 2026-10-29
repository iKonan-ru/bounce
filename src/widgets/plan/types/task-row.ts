import type { Song } from '@/entities/song';
import type { Task } from '@/entities/task';
import type { User } from '@/entities/user';
import type { Bucket } from '@/shared/types';

/** Пропсы задачи в списке плана */
export interface TaskRowProps {
  task: Task;
  bucket: Bucket;
  projectId: string;
  /** Можно отмечать задачу */
  canWork: boolean;
  /** Открыть окно задачи */
  onOpen: () => void;
}

/** Данные и действия строки задачи */
export interface UseTaskRowResult {
  /** Песня задачи, если указана и уже загружена */
  song: Song | undefined;
  assignees: User[];
  isLeaving: boolean;
  /** Отметка "сделано" стоит: задача сделана или уже уходит из списка */
  isChecked: boolean;
  onDoneChange: (isDone: boolean) => void;
}
