import type { NoteScope } from '@/shared/types';

/** Заметка в очереди на отправку */
export interface PendingNote {
  /** Он же id записи на сервере: повтор после потерянного ответа не создаёт вторую заметку */
  id: string;
  scope: NoteScope;
  author: string;
  text: string;
  images: File[];
  audio: File[];
  created: string;
  /** Сервер отказал (не сеть): заметка ждёт, пока её не удалят. Имя поля хранится на устройствах */
  rejected?: boolean;
}

/** Новая заметка для очереди */
export interface QueuedNote extends Omit<PendingNote, 'id' | 'created'> {
  /** Id, с которым заметку уже пробовали отправить (если пробовали) */
  id?: string;
}

/** Итог прохода по очереди */
export interface FlushResult {
  sentCount: number;
  shouldRetry: boolean;
}
