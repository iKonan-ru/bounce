/// <reference path="../pb_data/types.d.ts" />

// Отключённая учётная запись (pb_migrations/1763700000_disabled_users.js): при отключении все
// её сессии закрываются (новый tokenKey - прежние токены, в том числе файловые, недействительны),
// а вход и продление сессии отклоняются. Об отключении сообщается только после верного пароля
// и кода, как и о 2FA.

onRecordUpdateRequest((event) => {
  const isDisabledNow =
    event.record.getBool('disabled') &&
    !event.record.original().getBool('disabled');

  if (isDisabledNow) {
    event.record.refreshTokenKey();
  }

  return event.next();
}, 'users');

onRecordAuthRequest((event) => {
  const isDisabled = Boolean(event.record) && event.record.getBool('disabled');

  if (isDisabled) {
    throw new BadRequestError('Учётная запись отключена.', {
      code: new ValidationError('user_disabled', 'Учётная запись отключена.'),
    });
  }

  return event.next();
}, 'users');
