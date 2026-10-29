/** Чем кончилась попытка входа */
export enum LoginResult {
  /** Вход выполнен */
  Ok = 'ok',
  /** Нужен код 2FA */
  TotpRequired = 'totp_required',
  /** Неверный код 2FA */
  TotpInvalid = 'totp_invalid',
  /** Учётная запись отключена */
  UserDisabled = 'user_disabled',
  /** Неверный логин или пароль */
  BadCredentials = 'bad_credentials',
}

/** Код отказа входа */
export type AuthErrorCode =
  LoginResult.TotpRequired | LoginResult.TotpInvalid | LoginResult.UserDisabled;

/** Ключ 2FA для приложения-аутентификатора */
export interface TotpSetup {
  secret: string;
  uri: string;
}
