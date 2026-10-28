import { useMutation } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader, SectionTitle } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMe } from '@/lib/auth';
import { downloadBackup, restoreBackup, uploadBackup } from '@/lib/backup';
import { fileSize } from '@/lib/format';

type Step = { kind: 'idle' } | { kind: 'upload'; progress: number } | { kind: 'restore' };

// Резервная копия всего: база, учётные записи и файлы. Только главный пользователь.
export function AdminBackupPage() {
  const me = useMe();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [step, setStep] = useState<Step>({ kind: 'idle' });

  const download = useMutation({
    mutationFn: downloadBackup,
    onError: () => toast.error('Копия не собралась: проверьте соединение'),
  });

  const restore = useMutation({
    mutationFn: async (f: File) => {
      setStep({ kind: 'upload', progress: 0 });
      const name = await uploadBackup(f, (progress) => setStep({ kind: 'upload', progress }));
      setStep({ kind: 'restore' });
      await restoreBackup(name);
    },
    onSuccess: () => {
      // данные и сессии теперь из копии: начинаем с чистого листа
      window.location.assign('/');
    },
    onError: () => {
      setStep({ kind: 'idle' });
      toast.error('Не удалось восстановить: файл не похож на копию Bounce или прервалась связь');
    },
  });

  if (me && !me.isAdmin) return <Navigate to="/me" />;

  return (
    <section className="flex max-w-2xl flex-col gap-8">
      <PageHeader crumbs={[{ label: 'Профиль', link: { to: '/me' } }]} title="Резервная копия" />

      <div>
        <SectionTitle>Скачать</SectionTitle>
        <Button
          size="lg"
          disabled={download.isPending || restore.isPending}
          onClick={() => download.mutate()}
        >
          <Download data-icon="inline-start" />
          {download.isPending ? 'Собираю копию...' : 'Скачать копию'}
        </Button>
      </div>

      <div>
        <SectionTitle>Восстановить</SectionTitle>
        <p className="mb-4 text-sm text-dim">
          Всё, что сейчас в Bounce, заменится содержимым копии.
        </p>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = '';
          }}
        />
        <Button
          size="lg"
          variant="secondary"
          disabled={download.isPending || restore.isPending}
          onClick={() => input.current?.click()}
        >
          <Upload data-icon="inline-start" />
          Выбрать файл копии
        </Button>
        {step.kind === 'upload' && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm">Загрузка {Math.round(step.progress * 100)}%</p>
            <Progress value={Math.round(step.progress * 100)} aria-label="Загрузка копии" />
          </div>
        )}
        {step.kind === 'restore' && (
          <p className="mt-4 text-sm">Восстанавливаю и перезапускаю сервер...</p>
        )}
      </div>

      <ConfirmDialog
        open={file !== undefined && !restore.isPending}
        onOpenChange={(o) => !o && setFile(undefined)}
        title="Восстановить из копии?"
        description={
          file
            ? `${file.name}, ${fileSize(file.size)}. Текущие данные заменятся данными из копии.`
            : undefined
        }
        confirm="Восстановить"
        onConfirm={() => {
          if (file) restore.mutate(file);
          setFile(undefined);
        }}
      />
    </section>
  );
}
