import { Download, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { GROUP_ROWS } from '@/shared/constants';
import {
  Progress,
  PageHeader,
  Button,
  ConfirmDialog,
  FileDropZone,
} from '@/shared/ui';
import { getFileSizeLabel } from '@/shared/utils';
import { Navigate } from '@tanstack/react-router';
import { PERCENT, BACKUP_CRUMBS } from '../constants/admin-backup';
import { useAdminBackupPage } from '../hooks/use-admin-backup-page';
import type { StepStatusProps } from '../types/admin-backup';
import { StepKind } from '../types/admin-backup';

/** Описание подтверждения восстановления: имя и размер выбранного файла */
function getConfirmDescription(file: File | undefined): string | undefined {
  if (!file) {
    return undefined;
  }

  return `${file.name}, ${getFileSizeLabel(file.size)}. Текущие данные заменятся данными из копии.`;
}

/** Ход восстановления: полоска загрузки файла или ожидание перезапуска сервера */
function StepStatus({ step }: StepStatusProps): ReactNode {
  if (step.kind === StepKind.Idle) {
    return null;
  }

  if (step.kind === StepKind.Restore) {
    return (
      <p className="px-4 py-4 text-sm">
        Восстанавливаю и перезапускаю сервер...
      </p>
    );
  }

  const percent = Math.round(step.progress * PERCENT);

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <p className="text-sm">Загрузка {percent}%</p>
      <Progress value={percent} aria-label="Загрузка копии" />
    </div>
  );
}

/** Резервная копия всего: база, учётные записи и файлы. Только главный пользователь */
export function AdminBackupPage(): ReactNode {
  const {
    isForbidden,
    fileInputRef,
    file,
    step,
    isDownloading,
    isBusy,
    isConfirmOpen,
    onDownloadClick,
    onPickClick,
    onFilesDrop,
    onFileChange,
    onConfirmOpenChange,
    onConfirm,
  } = useAdminBackupPage();

  if (isForbidden) {
    return <Navigate to="/me" />;
  }

  const confirmDescription = getConfirmDescription(file);

  return (
    <section className="max-w-2xl">
      <PageHeader crumbs={BACKUP_CRUMBS} title="Резервная копия" />

      <div className={GROUP_ROWS}>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-medium">Скачать копию</p>
            <p className="text-sm text-dim">
              Проекты, заметки, файлы и учётные записи в одном zip
            </p>
          </div>
          <Button disabled={isBusy} onClick={onDownloadClick}>
            <Download data-icon="inline-start" />
            {isDownloading ? 'Собираю...' : 'Скачать'}
          </Button>
        </div>
        <FileDropZone
          accept=".zip,application/zip,application/x-zip-compressed"
          onFiles={onFilesDrop}
          isDisabled={isBusy || isConfirmOpen}
        >
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Восстановить из копии</p>
              <p className="text-sm text-dim">
                Всё, что сейчас в Bounce, заменится содержимым копии
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={onFileChange}
            />
            <Button variant="secondary" disabled={isBusy} onClick={onPickClick}>
              <Upload data-icon="inline-start" />
              Выбрать файл
            </Button>
          </div>
        </FileDropZone>
        <StepStatus step={step} />
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={onConfirmOpenChange}
        title="Восстановить из копии?"
        description={confirmDescription}
        confirmLabel="Восстановить"
        onConfirm={onConfirm}
      />
    </section>
  );
}
