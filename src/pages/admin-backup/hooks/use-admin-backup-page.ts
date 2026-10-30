import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMe } from '@/shared/hooks';
import { useMutation } from '@tanstack/react-query';
import { downloadBackup, uploadBackup, restoreBackup } from '../api/backup';
import { IDLE_STEP, RESTORE_STEP } from '../constants/admin-backup';
import type { UseAdminBackupPageResult, Step } from '../types/admin-backup';
import { StepKind } from '../types/admin-backup';

/** Скачивание копии и восстановление из неё */
export function useAdminBackupPage(): UseAdminBackupPageResult {
  const me = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [step, setStep] = useState<Step>(IDLE_STEP);

  const download = useMutation({
    mutationFn: downloadBackup,
    onError: () => {
      toast.error('Копия не собралась: проверьте соединение');
    },
  });

  const restore = useMutation({
    mutationFn: async (backupFile: File): Promise<void> => {
      setStep({ kind: StepKind.Upload, progress: 0 });
      const name = await uploadBackup(backupFile, (progress) => {
        setStep({ kind: StepKind.Upload, progress });
      });
      setStep(RESTORE_STEP);
      await restoreBackup(name);
    },
    onSuccess: () => {
      // данные и сессии теперь из копии: начинаем с чистого листа
      window.location.assign('/');
    },
    onError: () => {
      setStep(IDLE_STEP);
      toast.error(
        'Не удалось восстановить: файл не похож на копию Bounce или прервалась связь'
      );
    },
  });

  const isForbidden = me !== null && !me.isAdmin;
  const isBusy = download.isPending || restore.isPending;
  const isConfirmOpen = file !== undefined && !restore.isPending;

  const onDownloadClick = (): void => {
    download.mutate();
  };

  const onPickClick = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFilesDrop = (files: File[]): void => {
    const picked = files[0];

    if (picked) {
      setFile(picked);
    }
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const picked = event.target.files?.[0];

    if (picked) {
      setFile(picked);
    }

    event.target.value = '';
  };

  const onConfirmOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      setFile(undefined);
    }
  };

  const onConfirm = (): void => {
    if (file) {
      restore.mutate(file);
    }

    setFile(undefined);
  };

  return {
    isForbidden,
    fileInputRef,
    file,
    step,
    isDownloading: download.isPending,
    isBusy,
    isConfirmOpen,
    onDownloadClick,
    onPickClick,
    onFilesDrop,
    onFileChange,
    onConfirmOpenChange,
    onConfirm,
  };
}
