// Помощники команды bounce-admin и сброса 2FA (pb_hooks/totp.pb.js): обработчики и команды
// PocketBase не видят переменные своего файла, общее подключается через require.

/** Подсказка по вызову команды bounce-admin */
const ADMIN_USAGE =
  'bounce-admin <логин> [<пароль> [имя] | --password-stdin] [--name имя] [--reset-2fa]';

/** Аргументов у команды: логин, пароль и имя */
const ADMIN_ARGS_MAX = 3;

/** Пароль со stdin - до первого перевода строки; пробелы внутри и по краям - часть пароля */
function readPasswordFromStdin() {
  // Прямого доступа к stdin у JSVM нет, читается /dev/stdin: это работает для канала (pipe) и
  // файла, как в docker compose exec -T и ssh, но не для сокета.
  let password = '';
  try {
    password = toString($os.readFile('/dev/stdin')).split('\n')[0].replace(/\r$/, '');
  } catch (error) {
    throw new Error(`пароль не прочитан со stdin: ${error}`);
  }
  if (!password) {
    throw new Error('пароль не прочитан со stdin: пусто');
  }
  return password;
}

/** Сбросить 2FA пользователю: ключ стирается, выданные токены перестают действовать */
function resetTotp(user) {
  user.set('totp_enabled', false);
  user.set('totp_secret', '');
  user.set('totp_pending', '');
  user.set('totp_step', 0);
  user.refreshTokenKey();
}

/** Пользователь по логину; нет такого - новый (новому нужен пароль) */
function findOrCreateUser(username, password) {
  try {
    return $app.findFirstRecordByData('users', 'username', username);
  } catch (_error) {
    if (!password) {
      throw new Error(`нет пользователя ${username}: новому нужен пароль`);
    }
    const user = new Record($app.findCollectionByNameOrId('users'));
    user.set('username', username);
    return user;
  }
}

module.exports = {
  ADMIN_USAGE,
  ADMIN_ARGS_MAX,
  readPasswordFromStdin,
  resetTotp,
  findOrCreateUser,
};
