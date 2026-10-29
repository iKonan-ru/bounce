import { ClientResponseError } from 'pocketbase';
import {
  BAD_REQUEST_STATUS,
  CYRILLIC_RE,
  NO_RESPONSE_STATUS,
  NETWORK_ERROR_RE,
  NOT_UNIQUE_CODE,
  RETRY_STATUSES,
  SERVER_ERROR_STATUS,
} from '../constants/errors';
import { SendVerdict } from '../types/errors';
import { getField, checkHasStringField } from '../utils/guards';

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

  const isReadableRefusal =
    error.status === BAD_REQUEST_STATUS && CYRILLIC_RE.test(error.message);

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
export function getFieldCode(
  error: ClientResponseError,
  field: string
): string {
  const fieldError = getField(error.response.data, field);

  return checkHasStringField(fieldError, 'code') ? fieldError.code : '';
}

/** Итог отправки заметки по ошибке запроса */
export function getSendVerdict(error: unknown): SendVerdict {
  if (!(error instanceof ClientResponseError)) {
    return checkIsNetworkError(error) ? SendVerdict.Retry : SendVerdict.Reject;
  }

  const { status } = error;
  const isAlreadySent =
    status === BAD_REQUEST_STATUS &&
    getFieldCode(error, 'id') === NOT_UNIQUE_CODE;

  if (isAlreadySent) {
    return SendVerdict.Sent;
  }

  const shouldRetry =
    RETRY_STATUSES.has(status) || status >= SERVER_ERROR_STATUS;

  return shouldRetry ? SendVerdict.Retry : SendVerdict.Reject;
}
