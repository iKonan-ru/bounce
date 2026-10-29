import { ClientResponseError } from 'pocketbase';
import { checkHasStringField, getField } from './guards';

/** Запасной текст ошибки для правки, которая не дошла до сервера */
export const SAVE_FAILED = 'Не сохранилось: проверьте соединение';

/** Статус ответа PocketBase "запрос отклонён": ошибка проверки или нет доступа */
export const BAD_REQUEST_STATUS = 400;

/** Статус "нет ответа": обрыв сети */
const NO_RESPONSE_STATUS = 0;

/** С этого статуса начинаются сбои сервера и прокси */
const SERVER_ERROR_STATUS = 500;

/** Статусы, после которых отправку стоит повторить: сеть, сессия, таймаут, частота запросов */
const RETRY_STATUSES: ReadonlySet<number> = new Set([NO_RESPONSE_STATUS, 401, 403, 408, 429]);

/** Код ошибки поля id: запись с таким id уже есть */
const NOT_UNIQUE_CODE = 'validation_not_unique';

/** Причина по-русски: такие пишут хуки Bounce */
const CYRILLIC_RE = /[а-яё]/i;

/** Текст ошибки сети в браузерах */
const NETWORK_ERROR_RE = /сеть|network|fetch/i;

/**
 * Отказ сервера с понятной причиной (например, для отправки на лейбл нет текста) - его словами,
 * остальное - запасным текстом
 *
 * Причины пишут хуки Bounce по-русски; общие ответы PocketBase ("Failed to create record.")
 * человеку ничего не скажут
 */
export function getErrorText(error: unknown, fallback: string): string {
  if (!(error instanceof ClientResponseError)) {
    return fallback;
  }
  const isReadableRefusal = error.status === BAD_REQUEST_STATUS && CYRILLIC_RE.test(error.message);
  return isReadableRefusal ? error.message : fallback;
}

/** Обрыв сети, а не ответ сервера */
export function checkIsNetworkError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    return error.status === NO_RESPONSE_STATUS;
  }
  return error instanceof Error && NETWORK_ERROR_RE.test(error.message);
}

/** Код ошибки поля из ответа PocketBase (data.<поле>.code) */
export function getFieldCode(error: ClientResponseError, field: string): string {
  const fieldError = getField(error.response.data, field);
  return checkHasStringField(fieldError, 'code') ? fieldError.code : '';
}

/**
 * Чем кончилась попытка отправить заметку из очереди
 *
 * - Sent - заметка с этим id на сервере уже есть: прошлая попытка дошла, потерялся ответ
 * - Retry - сеть, сбой сервера или прокси, частота запросов, сессия ещё не обновилась -
 *   заметка ждёт следующей попытки
 * - Reject - сервер не принимает саму заметку (проект удалён, доступ закрыт, файл не того
 *   типа): она ждёт, пока её не удалят
 */
export enum SendVerdict {
  Sent = 'sent',
  Retry = 'retry',
  Reject = 'reject',
}

/** Итог отправки заметки по ошибке запроса */
export function getSendVerdict(error: unknown): SendVerdict {
  if (!(error instanceof ClientResponseError)) {
    return checkIsNetworkError(error) ? SendVerdict.Retry : SendVerdict.Reject;
  }
  const { status } = error;
  const isAlreadySent =
    status === BAD_REQUEST_STATUS && getFieldCode(error, 'id') === NOT_UNIQUE_CODE;
  if (isAlreadySent) {
    return SendVerdict.Sent;
  }
  const shouldRetry = RETRY_STATUSES.has(status) || status >= SERVER_ERROR_STATUS;
  return shouldRetry ? SendVerdict.Retry : SendVerdict.Reject;
}
