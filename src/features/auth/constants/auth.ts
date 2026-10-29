import type { AuthErrorCode } from '../types/auth';
import { LoginResult } from '../types/auth';

/** Отказ входа с причиной из хуков (data.code.code): 2FA (pb_hooks/totp.pb.js) или отключённая учётная запись (pb_hooks/users.pb.js) */
export const AUTH_ERROR_CODES: readonly AuthErrorCode[] = [
  LoginResult.TotpRequired,
  LoginResult.TotpInvalid,
  LoginResult.UserDisabled,
];

/** Ответы, которыми сервер отказывает в сессии: токен отозван, истёк или учётной записи больше нет */
export const SESSION_REJECTED_STATUSES: ReadonlySet<number> = new Set([
  401, 403,
]);
