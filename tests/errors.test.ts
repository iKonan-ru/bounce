import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { getSendVerdict } from '@/shared/api';
import { SendVerdict } from '@/shared/types';
import type { AbstractObject } from '@/shared/types';

/** Текст ошибки в ответе сервера: решение от него не зависит */
const ERROR_MESSAGE = 'x';

/** Ошибка ответа PocketBase с кодом статуса и ошибками полей */
function createResponseError(
  status: number,
  data: AbstractObject = {}
): ClientResponseError {
  return new ClientResponseError({
    status,
    response: { status, message: ERROR_MESSAGE, data },
  });
}

describe('черновик из очереди: отправлен, повторить или отказ', () => {
  it('обрыв сети - повторить', () => {
    expect(getSendVerdict(createResponseError(0))).toBe(SendVerdict.Retry);
    expect(getSendVerdict(new Error('сеть недоступна'))).toBe(
      SendVerdict.Retry
    );
    expect(getSendVerdict(new TypeError('Failed to fetch'))).toBe(
      SendVerdict.Retry
    );
  });

  it('заметка с этим id уже есть - отправлена', () => {
    const duplicateError = createResponseError(400, {
      id: { code: 'validation_not_unique', message: 'Value must be unique.' },
    });
    expect(getSendVerdict(duplicateError)).toBe(SendVerdict.Sent);
  });

  it('сбой сервера, прокси, частота запросов, сессия - повторить', () => {
    for (const status of [401, 403, 408, 429, 500, 502, 503]) {
      expect(getSendVerdict(createResponseError(status))).toBe(
        SendVerdict.Retry
      );
    }
  });

  it('сервер не принимает саму заметку - отказ', () => {
    const invalidMimeError = createResponseError(400, {
      audio: { code: 'validation_invalid_mime_type' },
    });
    expect(getSendVerdict(invalidMimeError)).toBe(SendVerdict.Reject);
    expect(getSendVerdict(createResponseError(404))).toBe(SendVerdict.Reject);
    expect(getSendVerdict(createResponseError(413))).toBe(SendVerdict.Reject);
    expect(getSendVerdict(new Error('NotReadableError'))).toBe(
      SendVerdict.Reject
    );
  });
});
