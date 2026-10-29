import { Download, Upload } from 'lucide-react';
import {
  type ChangeEvent,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { type Crumb, GROUP_ROWS, PageHeader } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMe } from '@/lib/auth';
import { downloadBackup, restoreBackup, uploadBackup } from '@/lib/backup';
import { getFileSizeLabel } from '@/lib/format';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';

/** Шаг восстановления из копии */
enum StepKind {
  /** Ничего не происходит */
  Idle = 'idle',
  /** Файл копии отправляется на сервер */
  Upload = 'upload',
  /** Сервер восстанавливает данные и перезапускается */
  Restore = 'restore',
}

/** Восстановление не идёт */
interface IdleStep {
  kind: StepKind.Idle;
}

/** Отправка файла копии */
interface UploadStep {
  kind: StepKind.Upload;
  /** Доля отправленного: от 0 до 1 */
  progress: number;
}

/** Восстановление на сервере */
interface RestoreStep {
  kind: StepKind.Restore;
}

/** Шаг восстановления с его данными */
type Step = IdleStep | UploadStep | RestoreStep;

/** Шаг до начала восстановления */
const IDLE_STEP: IdleStep = { kind: StepKind.Idle };

/** Шаг восстановления на сервере */
const RESTORE_STEP: RestoreStep = { kind: StepKind.Restore };

/** Множитель доли в проценты */
const PERCENT = 100;

/** Путь к странице: из профиля */
const BACKUP_CRUMBS: readonly Crumb[] = [
  { label: 'Профиль', link: { to: '/me' } },
];

/** Описание подтверждения восстановления: имя и размер выбранного файла */
function getConfirmDescription(file: File | undefined): string | undefined {
  if (!file) {
    return undefined;
  }

  return `${file.name}, ${getFileSizeLabel(file.size)}. Текущие данные заменятся данными из копии.`;
}

/** Пропсы строки хода восстановления */
interface StepStatusProps {
  step: Step;
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

/** Состояние и действия страницы резервной копии */
interface UseAdminBackupPageResult {
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

/** Скачивание копии и восстановление из неё */
function useAdminBackupPage(): UseAdminBackupPageResult {
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
    onFileChange,
    onConfirmOpenChange,
    onConfirm,
  };
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
