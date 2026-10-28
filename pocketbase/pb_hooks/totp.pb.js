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
// Первый главный пользователь: pocketbase bounce-admin <логин> <пароль> [имя]

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
    if (step < 0) {
      throw new BadRequestError('Неверный код.', {
        code: new ValidationError('totp_invalid', 'Неверный код.'),
      });
    }
    user.set('totp_step', step);
    e.app.save(user);
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
    if (step < 0) {
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

$app.rootCmd.addCommand(
  new Command({
    use: 'bounce-admin',
    short: 'Создать главного пользователя или вернуть ему права и пароль',
    run: (_cmd, args) => {
      if (args.length < 2) {
        throw new Error('bounce-admin <логин> <пароль> [имя]');
      }
      // своя команда запускается до автоматических миграций serve: схема нужна уже сейчас
      $app.runAllMigrations();
      const username = String(args[0]).toLowerCase();
      const users = $app.findCollectionByNameOrId('users');
      let user;
      try {
        user = $app.findFirstRecordByData('users', 'username', username);
      } catch (_err) {
        user = new Record(users);
        user.set('username', username);
      }
      user.set('name', args[2] || user.getString('name') || username);
      user.set('is_admin', true);
      user.setPassword(String(args[1]));
      $app.save(user);
      console.log(`главный пользователь ${username} сохранён`);
    },
  }),
);
