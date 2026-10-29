// TOTP хуков PocketBase по векторам RFC 6238 (SHA-1, ключ "12345678901234567890", 6 знаков -
// последние 6 цифр из таблицы RFC).
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/** Функции TOTP из хуков PocketBase (pb_hooks/lib/totp.js) */
interface Totp {
  getCode(secret: string, unixSeconds: number): string;
  /** Шаг времени, которому подошёл код, или -1; lastStep - последний уже принятый шаг */
  getVerifiedStep(
    secret: string,
    input: string,
    unixSeconds: number,
    lastStep: number
  ): number;
  getStepAt(unixSeconds: number): number;
  getOtpauthUri(secret: string, account: string, issuer: string): string;
}

/** require для CommonJS-модулей хуков */
const requireModule = createRequire(import.meta.url);

/** TOTP из хуков PocketBase */
const totp: Totp = requireModule('../pocketbase/pb_hooks/lib/totp.js');

/** Ключ "12345678901234567890" из RFC 6238 в base32 */
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Длина шага TOTP, секунды */
const STEP_SECONDS = 30;

/** Сдвиг времени, на котором код уже не принимается: три шага */
const FAR_OFFSET_SECONDS = 3 * STEP_SECONDS;

/** Момент проверки соседних шагов (вектор RFC) */
const CHECK_TIME = 1234567890;

/** Момент первого вектора RFC */
const FIRST_VECTOR_TIME = 59;

/** Шаг "ещё не было принятых кодов" */
const NO_STEP = 0;

describe('TOTP', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('RFC 6238, t=%i', (unixSeconds, expected) => {
    expect(totp.getCode(SECRET, unixSeconds)).toBe(expected);
  });

  it('принимает соседний шаг и не принимает дальний', () => {
    const previousTime = CHECK_TIME - STEP_SECONDS;
    const nextTime = CHECK_TIME + STEP_SECONDS;
    const farTime = CHECK_TIME - FAR_OFFSET_SECONDS;
    const previousCode = totp.getCode(SECRET, previousTime);
    const nextCode = totp.getCode(SECRET, nextTime);
    const farCode = totp.getCode(SECRET, farTime);
    expect(
      totp.getVerifiedStep(SECRET, previousCode, CHECK_TIME, NO_STEP)
    ).toBe(totp.getStepAt(previousTime));
    expect(totp.getVerifiedStep(SECRET, nextCode, CHECK_TIME, NO_STEP)).toBe(
      totp.getStepAt(nextTime)
    );
    expect(totp.getVerifiedStep(SECRET, farCode, CHECK_TIME, NO_STEP)).toBe(-1);
  });

  it('один код - один вход', () => {
    const code = totp.getCode(SECRET, CHECK_TIME);
    const step = totp.getVerifiedStep(SECRET, code, CHECK_TIME, NO_STEP);
    expect(step).toBeGreaterThan(0);
    expect(totp.getVerifiedStep(SECRET, code, CHECK_TIME, step)).toBe(-1);
  });

  it('мусор вместо кода', () => {
    expect(
      totp.getVerifiedStep(SECRET, '12345', FIRST_VECTOR_TIME, NO_STEP)
    ).toBe(-1);
    expect(
      totp.getVerifiedStep(SECRET, 'abcdef', FIRST_VECTOR_TIME, NO_STEP)
    ).toBe(-1);
    expect(
      totp.getVerifiedStep(SECRET, ' 287 082 ', FIRST_VECTOR_TIME, NO_STEP)
    ).toBe(totp.getStepAt(FIRST_VECTOR_TIME));
  });

  it('otpauth-ссылка для приложения', () => {
    expect(totp.getOtpauthUri(SECRET, 'konan', 'Bounce')).toBe(
      `otpauth://totp/Bounce%3Akonan?secret=${SECRET}&issuer=Bounce&algorithm=SHA1&digits=6&period=30`
    );
  });
});
