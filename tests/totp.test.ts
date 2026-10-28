// TOTP хуков PocketBase по векторам RFC 6238 (SHA-1, ключ "12345678901234567890", 6 знаков -
// последние 6 цифр из таблицы RFC).
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type Totp = {
  code(secret: string, unixSeconds: number): string;
  verify(secret: string, input: string, unixSeconds: number, lastStep: number): number;
  stepAt(unixSeconds: number): number;
  uri(secret: string, account: string, issuer: string): string;
};

const load = createRequire(import.meta.url);
const totp: Totp = load('../pocketbase/pb_hooks/lib/totp.js');

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('RFC 6238, t=%i', (t, expected) => {
    expect(totp.code(SECRET, t)).toBe(expected);
  });

  it('принимает соседний шаг и не принимает дальний', () => {
    const t = 1234567890;
    expect(totp.verify(SECRET, totp.code(SECRET, t - 30), t, 0)).toBe(totp.stepAt(t - 30));
    expect(totp.verify(SECRET, totp.code(SECRET, t + 30), t, 0)).toBe(totp.stepAt(t + 30));
    expect(totp.verify(SECRET, totp.code(SECRET, t - 90), t, 0)).toBe(-1);
  });

  it('один код - один вход', () => {
    const t = 1234567890;
    const c = totp.code(SECRET, t);
    const step = totp.verify(SECRET, c, t, 0);
    expect(step).toBeGreaterThan(0);
    expect(totp.verify(SECRET, c, t, step)).toBe(-1);
  });

  it('мусор вместо кода', () => {
    expect(totp.verify(SECRET, '12345', 59, 0)).toBe(-1);
    expect(totp.verify(SECRET, 'abcdef', 59, 0)).toBe(-1);
    expect(totp.verify(SECRET, ' 287 082 ', 59, 0)).toBe(totp.stepAt(59));
  });

  it('otpauth-ссылка для приложения', () => {
    expect(totp.uri(SECRET, 'konan', 'Bounce')).toBe(
      `otpauth://totp/Bounce%3Akonan?secret=${SECRET}&issuer=Bounce&algorithm=SHA1&digits=6&period=30`,
    );
  });
});
