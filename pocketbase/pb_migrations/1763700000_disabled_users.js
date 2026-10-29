/// <reference path="../pb_data/types.d.ts" />

// Отключённая учётная запись (users.disabled) вместо удаления. Удалить человека, который владеет
// проектом или написал заметку, задачу или публикацию, нельзя: на него ссылаются обязательные
// поля. Отключённый не входит, его сессии закрыты (pb_hooks/users.pb.js), а его записи, роли и
// назначения остаются, как были; включить его можно обратно.
//
// Отключает и включает только главный, и не себя: иначе можно остаться без главного. Себе
// поле не поменять никому.

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
const NO_TOTP_FIELDS = ['totp_enabled', 'totp_secret', 'totp_pending', 'totp_step']
  .map((f) => `@request.body.${f}:isset = false`)
  .join(' && ');
const unset = (fields) => fields.map((f) => `@request.body.${f}:isset = false`).join(' && ');

// правило до этой миграции (1762400000_roles.js)
const BEFORE = `${TOTP_OK} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && ${unset(['is_admin', 'username', 'can_create_projects'])}) || @request.auth.is_admin = true)`;
const AFTER = `${TOTP_OK} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && ${unset(['is_admin', 'username', 'can_create_projects', 'disabled'])}) || (@request.auth.is_admin = true && (id != @request.auth.id || @request.body.disabled:isset = false)))`;

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    if (!users.fields.getByName('disabled')) {
      users.fields.add(new Field({ name: 'disabled', type: 'bool' }));
    }
    users.updateRule = AFTER;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.updateRule = BEFORE;
    users.fields.removeByName('disabled');
    app.save(users);
  },
);
