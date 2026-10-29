// Куда вернуться после входа: открыли ссылку на песню без сессии - после входа и 2FA человек
// попадает на эту песню, а не на главную. Адрес лежит в sessionStorage вкладки. После явного
// выхода ("Выйти") прежняя страница не запоминается: следующим может войти другой человек.

const KEY = 'bounce.return-to';
let afterLogout = false;

// только свои страницы приложения, не вход и не подключение 2FA
function usable(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !/^\/(login|setup-2fa)\b/.test(path);
}

export function rememberReturn(path: string): void {
  if (afterLogout || !usable(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // без хранилища после входа - на главную
  }
}

export function forgetReturn(): void {
  afterLogout = true;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // нечего стирать
  }
}

// адрес для перехода после входа (и забыть его)
export function takeReturn(): string {
  afterLogout = false;
  try {
    const path = sessionStorage.getItem(KEY) ?? '';
    sessionStorage.removeItem(KEY);
    return usable(path) ? path : '/';
  } catch {
    return '/';
  }
}
