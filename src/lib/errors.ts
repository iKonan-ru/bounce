import { ClientResponseError } from 'pocketbase';

// запасной текст ошибки для правки, которая не дошла до сервера
export const SAVE_FAILED = 'Не сохранилось: проверьте соединение';

// Отказ сервера с понятной причиной (например, для отправки на лейбл нет текста) - его словами,
// остальное - запасным текстом. Причины пишут хуки Bounce по-русски; общие ответы PocketBase
// ("Failed to create record.") человеку ничего не скажут.
export function errorText(e: unknown, fallback: string): string {
  return e instanceof ClientResponseError && e.status === 400 && /[а-яё]/i.test(e.message)
    ? e.message
    : fallback;
}

// обрыв сети, а не ответ сервера
export function isNetworkError(e: unknown): boolean {
  if (e instanceof ClientResponseError) return e.status === 0;
  return e instanceof Error && /сеть|network|fetch/i.test(e.message);
}

// код ошибки поля из ответа PocketBase (data.<поле>.code)
function fieldCode(e: ClientResponseError, field: string): string {
  const f: unknown = e.response['data']?.[field];
  return typeof f === 'object' && f !== null && 'code' in f && typeof f.code === 'string'
    ? f.code
    : '';
}

// Чем кончилась попытка отправить заметку из очереди:
//   sent   - заметка с этим id на сервере уже есть: прошлая попытка дошла, потерялся ответ;
//   retry  - сеть, сбой сервера или прокси, частота запросов, сессия ещё не обновилась -
//            заметка ждёт следующей попытки;
//   reject - сервер не принимает саму заметку (проект удалён, доступ закрыт, файл не того
//            типа): она ждёт, пока её не удалят.
export type SendVerdict = 'sent' | 'retry' | 'reject';

export function sendVerdict(e: unknown): SendVerdict {
  if (!(e instanceof ClientResponseError)) return isNetworkError(e) ? 'retry' : 'reject';
  const s = e.status;
  if (s === 0) return 'retry';
  if (s === 400 && fieldCode(e, 'id') === 'validation_not_unique') return 'sent';
  if (s === 401 || s === 403 || s === 408 || s === 429 || s >= 500) return 'retry';
  return 'reject';
}
