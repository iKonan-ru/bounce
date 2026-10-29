/** Ключ адреса возврата в sessionStorage */
export const RETURN_TO_KEY = 'bounce.return-to';

/** Главная страница */
export const HOME_PATH = '/';

/** Страницы входа и подключения 2FA: на них не возвращаемся */
export const AUTH_PATH_RE = /^\/(login|setup-2fa)\b/;
