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

onRecordAuthWithPasswordRequest((event) => {
  const totp = require(`${__hooks}/lib/totp.js`);
  const user = event.record;
  const needsCode =
    Boolean(user) &&
    user.getBool('totp_enabled') &&
    user.validatePassword(event.password);

  if (!needsCode) {
    return event.next();
  }

  const { code } = event.requestInfo().body;
  const hasCode = code !== undefined && code !== null;
  const input = hasCode ? String(code) : '';

  if (!input) {
    throw new BadRequestError('Нужен код из приложения-аутентификатора.', {
      code: new ValidationError(
        'totp_required',
        'Нужен код из приложения-аутентификатора.'
      ),
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const step = totp.getVerifiedStep(
    user.getString('totp_secret'),
    input,
    now,
    user.getInt('totp_step')
  );
  // код принимается один раз и при параллельных входах: шаг отмечается атомарно
  const claim = require(`${__hooks}/lib/totp-claim.js`);
  const isAccepted = step >= 0 && claim.claimStep(event.app, user.id, step);

  if (!isAccepted) {
    throw new BadRequestError('Неверный код.', {
      code: new ValidationError('totp_invalid', 'Неверный код.'),
    });
  }

  user.set('totp_step', step);

  return event.next();
}, 'users');

routerAdd(
  'POST',
  '/api/bounce/totp/setup',
  (event) => {
    const totp = require(`${__hooks}/lib/totp.js`);
    const user = event.app.findRecordById('users', event.auth.id);

    if (user.getBool('totp_enabled')) {
      throw new BadRequestError('2FA уже подключена.');
    }

    // 32 символа base32 = 160 бит, как советует RFC 4226
    const secret = $security.randomStringWithAlphabet(32, totp.BASE32);
    user.set('totp_pending', secret);
    event.app.save(user);
    const uri = totp.getOtpauthUri(
      secret,
      user.getString('username'),
      'Bounce'
    );

    return event.json(200, { secret, uri });
  },
  $apis.requireAuth('users')
);

routerAdd(
  'POST',
  '/api/bounce/totp/enable',
  (event) => {
    const totp = require(`${__hooks}/lib/totp.js`);
    const user = event.app.findRecordById('users', event.auth.id);
    const pending = user.getString('totp_pending');

    if (user.getBool('totp_enabled') || !pending) {
      throw new BadRequestError('Сначала получите новый ключ.');
    }

    const { code } = event.requestInfo().body;
    const hasCode = code !== undefined && code !== null;
    const input = hasCode ? String(code) : '';
    const now = Math.floor(Date.now() / 1000);
    const step = totp.getVerifiedStep(pending, input, now, 0);
    // из параллельных подтверждений одним кодом проходит одно: ключ забирается атомарно
    const claim = require(`${__hooks}/lib/totp-claim.js`);
    const isAccepted =
      step >= 0 && claim.claimPending(event.app, user.id, pending);

    if (!isAccepted) {
      throw new BadRequestError('Неверный код.', {
        code: new ValidationError('totp_invalid', 'Неверный код.'),
      });
    }

    user.set('totp_secret', pending);
    user.set('totp_pending', '');
    user.set('totp_enabled', true);
    user.set('totp_step', step);
    event.app.save(user);

    return event.json(200, { ok: true });
  },
  $apis.requireAuth('users')
);

routerAdd(
  'POST',
  '/api/bounce/users/{id}/totp-reset',
  (event) => {
    const me = event.app.findRecordById('users', event.auth.id);
    const isAdmin = me.getBool('is_admin') && me.getBool('totp_enabled');

    if (!isAdmin) {
      throw new ForbiddenError(
        'Сбросить 2FA может только главный пользователь.'
      );
    }

    const user = event.app.findRecordById(
      'users',
      event.request.pathValue('id')
    );
    // выданные токены перестают действовать
    require(`${__hooks}/lib/admin.js`).resetTotp(user);
    event.app.save(user);

    return event.json(200, { ok: true });
  },
  $apis.requireAuth('users')
);

// Команда главного пользователя (на сервере - tools/deploy.sh admin):
//   bounce-admin <логин> <пароль> [имя]            создать или вернуть права (и включить
//                                                  отключённую учётную запись), задать пароль
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
  short:
    'Создать главного пользователя или вернуть ему права, пароль и вход без 2FA',
  run: (cmd, args) => {
    const admin = require(`${__hooks}/lib/admin.js`);
    const flags = cmd.flags();
    const isFromStdin = flags.getBool('password-stdin');
    const shouldReset = flags.getBool('reset-2fa');
    const hasWrongArgCount =
      args.length === 0 || args.length > admin.ADMIN_ARGS_MAX;
    const hasExtraArgs = isFromStdin && args.length > 1;

    if (hasWrongArgCount || hasExtraArgs) {
      throw new Error(admin.ADMIN_USAGE);
    }

    let password = String(args[1] || '');

    if (isFromStdin) {
      password = admin.readPasswordFromStdin();
    }

    if (!password && !shouldReset) {
      throw new Error(admin.ADMIN_USAGE);
    }

    // своя команда запускается до автоматических миграций serve: схема нужна уже сейчас
    $app.runAllMigrations();
    const username = String(args[0]).toLowerCase();
    const user = admin.findOrCreateUser(username, password);
    const name = flags.getString('name') || String(args[2] || '');
    user.set('name', name || user.getString('name') || username);
    user.set('is_admin', true);
    user.set('disabled', false);

    if (password) {
      user.setPassword(password);
    }

    if (shouldReset) {
      admin.resetTotp(user);
    }

    $app.save(user);
    const resetNote = shouldReset ? ', 2FA сброшена' : '';
    console.log(`главный пользователь ${username} сохранён${resetNote}`);
  },
});
adminCmd.flags().bool('password-stdin', false, 'пароль - первая строка stdin');
adminCmd.flags().string('name', '', 'имя пользователя');
adminCmd
  .flags()
  .bool(
    'reset-2fa',
    false,
    'сбросить 2FA: войти по паролю и подключить заново'
  );
$app.rootCmd.addCommand(adminCmd);
