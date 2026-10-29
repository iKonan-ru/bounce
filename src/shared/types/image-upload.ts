import type { QueryKey } from '@tanstack/react-query';
import type { FileRecord } from './records';

/** Параметры загрузки картинки в одно поле записи */
export interface UseFieldUploadParams<Saved extends FileRecord> {
  record: FileRecord;
  /** Поле записи с картинкой */
  field: string;
  /** Уменьшенные копии, которые нужны сразу после загрузки */
  thumbs: readonly string[];
  /** Ключ запросов, которые перечитываются после загрузки */
  refresh: QueryKey;
  /** Запись сохранена: получает её новую версию */
  onSaved?: (next: Saved) => void;
}

/** Картинка в пути на сервер: локальная копия для показа и доля отправленного */
export interface PendingImage {
  url: string;
  /** Доля отправленного (0..1) */
  progress: number;
}

/** Отправка картинки: файл и обработчик хода отправки */
export type ImageUploader = (
  file: File,
  onProgress: (fraction: number) => void
) => Promise<unknown>;

/** Загрузка одной картинки */
export interface UseImageUploadResult {
  /** Начать загрузку выбранного файла */
  pick: (file: File) => void;
  /** Картинка в пути на сервер; без загрузки - undefined */
  pending: PendingImage | undefined;
  isBusy: boolean;
}
