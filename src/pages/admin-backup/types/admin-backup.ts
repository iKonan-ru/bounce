import type { RefObject, ChangeEvent } from 'react';

/** Шаг восстановления из копии */
export enum StepKind {
  /** Ничего не происходит */
  Idle = 'idle',
  /** Файл копии отправляется на сервер */
  Upload = 'upload',
  /** Сервер восстанавливает данные и перезапускается */
  Restore = 'restore',
}

/** Восстановление не идёт */
export interface IdleStep {
  kind: StepKind.Idle;
}

/** Отправка файла копии */
interface UploadStep {
  kind: StepKind.Upload;
  /** Доля отправленного: от 0 до 1 */
  progress: number;
}

/** Восстановление на сервере */
export interface RestoreStep {
  kind: StepKind.Restore;
}

/** Шаг восстановления с его данными */
export type Step = IdleStep | UploadStep | RestoreStep;

/** Пропсы строки хода восстановления */
export interface StepStatusProps {
  step: Step;
}

/** Состояние и действия страницы резервной копии */
export interface UseAdminBackupPageResult {
  /** Вошёл не главный пользователь: страница не для него */
  isForbidden: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  /** Выбранный файл копии, ждёт подтверждения */
  file: File | undefined;
  step: Step;
  isDownloading: boolean;
  /** Идёт скачивание или восстановление: кнопки недоступны */
  isBusy: boolean;
  isConfirmOpen: boolean;
  onDownloadClick: () => void;
  onPickClick: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}
