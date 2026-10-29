import { pb } from './pb';
import { sendForm } from './upload';

// Резервная копия (маршруты pb_hooks/backup.pb.js, только для главного пользователя).

// собрать копию на сервере и скачать её обычной ссылкой: файл может весить гигабайты
export async function downloadBackup(): Promise<void> {
  const name = backupName(await pb.send('/api/bounce/backup', { method: 'POST' }));
  const token = await pb.files.getToken();
  const url = new URL(
    pb.buildURL(`/api/bounce/backup/${encodeURIComponent(name)}`),
    window.location.origin,
  );
  url.searchParams.set('token', token);
  const a = document.createElement('a');
  a.href = url.toString();
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

// загрузить файл копии с ходом отправки
export async function uploadBackup(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  return backupName(
    await sendForm<unknown>('POST', '/api/bounce/backup/upload', form, { onProgress }),
  );
}

// имя копии из ответа сервера
function backupName(res: unknown): string {
  if (typeof res === 'object' && res !== null && 'name' in res && typeof res.name === 'string') {
    return res.name;
  }
  throw new Error('неожиданный ответ сервера');
}

async function waitHealthy(timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  // сначала сервер уходит на перезапуск, потом отвечает снова
  await new Promise((r) => setTimeout(r, 1500));
  while (Date.now() < until) {
    try {
      const res = await fetch(pb.buildURL('/api/health'), { cache: 'no-store' });
      if (res.ok) return;
    } catch {
      // ещё перезапускается
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('сервер не ответил после восстановления');
}

// Восстановление перезапускает сервер: ответ на запрос может не дойти, поэтому ждём, пока
// сервер снова ответит. Ошибка самого PocketBase (испорченный файл) приходит как обычно.
export async function restoreBackup(name: string): Promise<void> {
  try {
    await pb.send('/api/bounce/backup/restore', { method: 'POST', body: { name } });
  } catch (e) {
    const status = typeof e === 'object' && e && 'status' in e ? e.status : 0;
    if (typeof status === 'number' && status >= 400) throw e;
  }
  await waitHealthy(10 * 60_000);
}
