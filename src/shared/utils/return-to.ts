// Куда вернуться после входа: открыли ссылку на песню без сессии - после входа и 2FA человек
// попадает на эту песню, а не на главную. Адрес лежит в sessionStorage вкладки. После явного
// выхода ("Выйти") прежняя страница не запоминается: следующим может войти другой человек.
import { AUTH_PATH_RE, RETURN_TO_KEY, HOME_PATH } from '../constants/return-to';

/** Был явный выход: адрес не запоминается до следующего входа */
let isAfterLogout = false;

/** Свой адрес приложения, не вход и не подключение 2FA */
function checkIsReturnPath(path: string): boolean {
  const isOwnPath = path.startsWith('/') && !path.startsWith('//');

  return isOwnPath && !AUTH_PATH_RE.test(path);
}

/** Запомнить страницу, на которую вернуться после входа */
export function rememberReturn(path: string): void {
  if (isAfterLogout || !checkIsReturnPath(path)) {
    return;
  }

  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch (error) {
    // без хранилища после входа - на главную
    console.error(error);
  }
}

/** Явный выход: прежняя страница забывается */
export function forgetReturn(): void {
  isAfterLogout = true;
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch (error) {
    // нечего стирать
    console.error(error);
  }
}

/** Адрес для перехода после входа (и забыть его) */
export function takeReturn(): string {
  isAfterLogout = false;
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY) ?? '';
    sessionStorage.removeItem(RETURN_TO_KEY);

    return checkIsReturnPath(path) ? path : HOME_PATH;
  } catch {
    return HOME_PATH;
  }
}
