/// <reference path="../pb_data/types.d.ts" />

// Главный задаёт пароль другому пользователю без его старого пароля. PocketBase требует
// oldPassword у всех, кто не проходит manageRule учётных записей; без этого правила кнопка
// "Задать пароль" в разделе "Пользователи" всегда получала отказ.
//
// Себе главный меняет пароль как все - со старым: украденная сессия не перехватит учётную
// запись. При смене пароля PocketBase закрывает все сессии пользователя.
// Остальные ограничения updateRule (поля 2FA, логин, права) действуют и для главного.

const MANAGE = [
  '@request.auth.id != ""',
  '@request.auth.totp_enabled = true',
  '@request.auth.is_admin = true',
  'id != @request.auth.id',
].join(' && ');

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.manageRule = MANAGE;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.manageRule = null;
    app.save(users);
  },
);
