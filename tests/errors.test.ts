import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { sendVerdict } from '@/lib/errors';

const http = (status: number, data: Record<string, unknown> = {}) =>
  new ClientResponseError({ status, response: { status, message: 'x', data } });

describe('черновик из очереди: отправлен, повторить или отказ', () => {
  it('обрыв сети - повторить', () => {
    expect(sendVerdict(http(0))).toBe('retry');
    expect(sendVerdict(new Error('сеть недоступна'))).toBe('retry');
    expect(sendVerdict(new TypeError('Failed to fetch'))).toBe('retry');
  });

  it('заметка с этим id уже есть - отправлена', () => {
    const dup = http(400, {
      id: { code: 'validation_not_unique', message: 'Value must be unique.' },
    });
    expect(sendVerdict(dup)).toBe('sent');
  });

  it('сбой сервера, прокси, частота запросов, сессия - повторить', () => {
    for (const s of [401, 403, 408, 429, 500, 502, 503]) expect(sendVerdict(http(s))).toBe('retry');
  });

  it('сервер не принимает саму заметку - отказ', () => {
    expect(sendVerdict(http(400, { audio: { code: 'validation_invalid_mime_type' } }))).toBe(
      'reject',
    );
    expect(sendVerdict(http(404))).toBe('reject');
    expect(sendVerdict(http(413))).toBe('reject');
    expect(sendVerdict(new Error('NotReadableError'))).toBe('reject');
  });
});
