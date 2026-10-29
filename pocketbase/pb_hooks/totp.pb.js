/// <reference path="../pb_data/types.d.ts" />

// 2FA по коду из приложения-аутентификатора (TOTP).
//
// Вход: POST /api/collections/users/auth-with-password с полем code. Если у пользователя 2FA
// подключена, без верного кода токен не выдаётся (ошибка 400 с data.code: totp_required или
// totp_invalid). О том, что нужен код, сообщается только после верного пароля.
//
// Подключение (вход уже выполнен паролем, но данные ещё закрыты правилами):
//   POST /api/bounce/totp/setup   -> { secret, uri }   новый ключ, пока не подтверждён
//   POST /api/bounce/totp/enable  { code } -> { ok }    подтверждение кодом, 2FA включена
// Сброс главным пользователем: POST /api/bounce/users/{id}/totp-reset - ключ стирается,
// сессии пользователя закрываются, при следующем входе 2FA подключается заново.
//
// Первый главный пользователь и восстановление доступа: команда bounce-admin (в конце файла).

onRecordAuthWithPasswordRequest((e) => {
  const totp = require(`${__hooks}/lib/totp.js`);
  const user = e.record;
  if (user && user.getBool('totp_enabled') && user.validatePassword(e.password)) {
    const body = e.requestInfo().body;
    const input = body.code === undefined || body.code === null ? '' : String(body.code);
    if (!input) {
      throw new BadRequestError('Нужен код из приложения-аутентификатора.', {
        code: new ValidationError('totp_required', 'Нужен код из приложения-аутентификатора.'),
      });
    }
    const now = Math.floor(Date.now() / 1000);
    const step = totp.verify(user.getString('totp_secret'), input, now, user.getInt('totp_step'));
    // код принимается один раз и при параллельных входах: шаг отмечается атомарно
    const claim = require(`${__hooks}/lib/totp-claim.js`);
    if (step < 0 || !claim.claimStep(e.app, user.id, step)) {
      throw new BadRequestError('Неверный код.', {
        code: new ValidationError('totp_invalid', 'Неверный код.'),
      });
    }
    user.set('totp_step', step);
  }
  return e.next();
}, 'users');

routerAdd(
  'POST',
  '/api/bounce/totp/setup',
  (e) => {
    const totp = require(`${__hooks}/lib/totp.js`);
    const user = e.app.findRecordById('users', e.auth.id);
    if (user.getBool('totp_enabled')) {
      throw new BadRequestError('2FA уже подключена.');
    }
    // 32 символа base32 = 160 бит, как советует RFC 4226
    const secret = $security.randomStringWithAlphabet(32, totp.BASE32);
    user.set('totp_pending', secret);
    e.app.save(user);
    return e.json(200, { secret, uri: totp.uri(secret, user.getString('username'), 'Bounce') });
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/bounce/totp/enable',
  (e) => {
    const totp = require(`${__hooks}/lib/totp.js`);
    const user = e.app.findRecordById('users', e.auth.id);
    const pending = user.getString('totp_pending');
    if (user.getBool('totp_enabled') || !pending) {
      throw new BadRequestError('Сначала получите новый ключ.');
    }
    const body = e.requestInfo().body;
    const now = Math.floor(Date.now() / 1000);
    const step = totp.verify(
      pending,
      body.code === undefined || body.code === null ? '' : String(body.code),
      now,
      0,
    );
    // из параллельных подтверждений одним кодом проходит одно: ключ забирается атомарно
    const claim = require(`${__hooks}/lib/totp-claim.js`);
    if (step < 0 || !claim.claimPending(e.app, user.id, pending)) {
      throw new BadRequestError('Неверный код.', {
        code: new ValidationError('totp_invalid', 'Неверный код.'),
      });
    }
    user.set('totp_secret', pending);
    user.set('totp_pending', '');
    user.set('totp_enabled', true);
    user.set('totp_step', step);
    e.app.save(user);
    return e.json(200, { ok: true });
  },
  $apis.requireAuth('users'),
);

routerAdd(
  'POST',
  '/api/bounce/users/{id}/totp-reset',
  (e) => {
    const me = e.app.findRecordById('users', e.auth.id);
    if (!me.getBool('is_admin') || !me.getBool('totp_enabled')) {
      throw new ForbiddenError('Сбросить 2FA может только главный пользователь.');
    }
    const user = e.app.findRecordById('users', e.request.pathValue('id'));
    user.set('totp_enabled', false);
    user.set('totp_secret', '');
    user.set('totp_pending', '');
    user.set('totp_step', 0);
    // выданные токены перестают действовать
    user.refreshTokenKey();
    e.app.save(user);
    return e.json(200, { ok: true });
  },
  $apis.requireAuth('users'),
);

// Команда главного пользователя (на сервере - tools/deploy.sh admin):
//   bounce-admin <логин> <пароль> [имя]            создать или вернуть права и задать пароль
//   bounce-admin <логин> --password-stdin [--name имя]
//                                                  то же, пароль - первая строка stdin: так он
//                                                  не виден в списке процессов сервера
//   bounce-admin <логин> --reset-2fa [...]         ещё и сбросить 2FA (потерян аутентификатор):
//                                                  ключ стирается, сессии закрываются, при
//                                                  входе 2FA подключается заново; без пароля
//                                                  пароль остаётся прежним
// Флаги - обычные флаги cobra: в JSVM их объявляют через cmd.flags() до addCommand.
const adminCmd = new Command({
  use: 'bounce-admin <логин> [пароль] [имя]',
  short: 'Создать главного пользователя или вернуть ему права, пароль и вход без 2FA',
  run: (cmd, args) => {
    const flags = cmd.flags();
    const fromStdin = flags.getBool('password-stdin');
    const reset = flags.getBool('reset-2fa');
    const usage =
      'bounce-admin <логин> [<пароль> [имя] | --password-stdin] [--name имя] [--reset-2fa]';
    if (args.length < 1 || args.length > 3 || (fromStdin && args.length > 1)) {
      throw new Error(usage);
    }
    // Пароль со stdin - до первого перевода строки; пробелы внутри и по краям - часть пароля.
    // Прямого доступа к stdin у JSVM нет, читается /dev/stdin: это работает для канала (pipe) и
    // файла, как в docker compose exec -T и ssh, но не для сокета.
    let password = String(args[1] || '');
    if (fromStdin) {
      try {
        password = toString($os.readFile('/dev/stdin')).split('\n')[0].replace(/\r$/, '');
      } catch (err) {
        throw new Error(`пароль не прочитан со stdin: ${err}`);
      }
      if (!password) throw new Error('пароль не прочитан со stdin: пусто');
    }
    if (!password && !reset) throw new Error(usage);
    // своя команда запускается до автоматических миграций serve: схема нужна уже сейчас
    $app.runAllMigrations();
    const username = String(args[0]).toLowerCase();
    const users = $app.findCollectionByNameOrId('users');
    let user;
    try {
      user = $app.findFirstRecordByData('users', 'username', username);
    } catch (_err) {
      if (!password) throw new Error(`нет пользователя ${username}: новому нужен пароль`);
      user = new Record(users);
      user.set('username', username);
    }
    const name = flags.getString('name') || String(args[2] || '');
    user.set('name', name || user.getString('name') || username);
    user.set('is_admin', true);
    if (password) user.setPassword(password);
    if (reset) {
      // как сброс главным в приложении (/api/bounce/users/{id}/totp-reset)
      user.set('totp_enabled', false);
      user.set('totp_secret', '');
      user.set('totp_pending', '');
      user.set('totp_step', 0);
      user.refreshTokenKey();
    }
    $app.save(user);
    console.log(`главный пользователь ${username} сохранён${reset ? ', 2FA сброшена' : ''}`);
  },
});
adminCmd.flags().bool('password-stdin', false, 'пароль - первая строка stdin');
adminCmd.flags().string('name', '', 'имя пользователя');
adminCmd.flags().bool('reset-2fa', false, 'сбросить 2FA: войти по паролю и подключить заново');
$app.rootCmd.addCommand(adminCmd);
