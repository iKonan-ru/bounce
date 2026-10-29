/// <reference path="../pb_data/types.d.ts" />
// Отключённая учётная запись (pb_migrations/1763700000_disabled_users.js): при отключении все
// её сессии закрываются (новый tokenKey - прежние токены, в том числе файловые, недействительны),
// а вход и продление сессии отклоняются. Об отключении сообщается только после верного пароля
// и кода, как и о 2FA.

onRecordUpdateRequest((e) => {
  if (e.record.getBool('disabled') && !e.record.original().getBool('disabled')) {
    e.record.refreshTokenKey();
  }
  return e.next();
}, 'users');

onRecordAuthRequest((e) => {
  if (e.record && e.record.getBool('disabled')) {
    throw new BadRequestError('Учётная запись отключена.', {
      code: new ValidationError('user_disabled', 'Учётная запись отключена.'),
    });
  }
  return e.next();
}, 'users');
