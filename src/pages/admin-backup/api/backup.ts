// Резервная копия (маршруты pb_hooks/backup.pb.js, только для главного пользователя).
import { pb, sendForm } from '@/shared/api';
import { FormMethod } from '@/shared/types';
import { checkHasStringField, delay, getNumberField } from '@/shared/utils';
import {
  RESTART_GRACE_MS,
  HEALTH_CHECK_INTERVAL_MS,
  REFUSAL_STATUS_MIN,
  RESTORE_TIMEOUT_MS,
} from '../constants/backup';

/** Имя копии из ответа сервера */
function getBackupName(response: unknown): string {
  if (checkHasStringField(response, 'name')) {
    return response.name;
  }

  throw new Error('неожиданный ответ сервера');
}

/** Собрать копию на сервере и скачать её обычной ссылкой: файл может весить гигабайты */
export async function downloadBackup(): Promise<void> {
  const name = getBackupName(
    await pb.send('/api/bounce/backup', { method: 'POST' })
  );
  const token = await pb.files.getToken();
  const url = new URL(
    pb.buildURL(`/api/bounce/backup/${encodeURIComponent(name)}`),
    window.location.origin
  );
  url.searchParams.set('token', token);
  const link = document.createElement('a');
  link.href = url.toString();
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
}

/** Загрузить файл копии с ходом отправки */
export async function uploadBackup(
  file: File,
  onProgress: (fraction: number) => void
): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  const response = await sendForm<unknown>(
    FormMethod.Create,
    '/api/bounce/backup/upload',
    form,
    {
      onProgress,
    }
  );

  return getBackupName(response);
}

/** Сервер отвечает на проверку здоровья */
async function checkIsServerHealthy(): Promise<boolean> {
  try {
    const response = await fetch(pb.buildURL('/api/health'), {
      cache: 'no-store',
    });

    return response.ok;
  } catch (error) {
    // ещё перезапускается
    console.error(error);

    return false;
  }
}

/** Ждать, пока сервер снова ответит, но не дольше timeoutMs */
async function waitUntilHealthy(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  await delay(RESTART_GRACE_MS);
  while (Date.now() < deadline) {
    if (await checkIsServerHealthy()) {
      return;
    }

    await delay(HEALTH_CHECK_INTERVAL_MS);
  }
  throw new Error('сервер не ответил после восстановления');
}

/**
 * Восстановление перезапускает сервер: ответ на запрос может не дойти, поэтому ждём, пока
 * сервер снова ответит
 *
 * Ошибка самого PocketBase (испорченный файл) приходит как обычно
 */
export async function restoreBackup(name: string): Promise<void> {
  try {
    await pb.send('/api/bounce/backup/restore', {
      method: 'POST',
      body: { name },
    });
  } catch (error) {
    const status = getNumberField(error, 'status') ?? 0;

    if (status >= REFUSAL_STATUS_MIN) {
      throw error;
    }
  }
  await waitUntilHealthy(RESTORE_TIMEOUT_MS);
}
