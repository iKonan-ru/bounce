/// <reference path="../pb_data/types.d.ts" />

// Аватары пользователей: файл закрытый, как и остальные картинки, с уменьшенными копиями для
// списков и профиля.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const avatar = users.fields.getByName('avatar');
    avatar.protected = true;
    avatar.maxSize = 20 * 1024 * 1024;
    avatar.mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    avatar.thumbs = ['96x96', '256x256'];
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const avatar = users.fields.getByName('avatar');
    avatar.protected = false;
    avatar.thumbs = [];
    app.save(users);
  },
);
