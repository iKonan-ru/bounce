/// <reference path="../pb_data/types.d.ts" />

// Релиз песни: статус "отправлена на лейбл", обложка для релиза (JPEG 3000x3000, хранится в
// исходном виде и скачивается целиком) и ссылка bandlink. Проверки и автоматический статус
// "выпущена" - в pb_hooks/release.pb.js.

migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('status').values = ['active', 'paused', 'done', 'sent', 'released'];
    songs.fields.add(
      new Field({
        name: 'release_cover',
        type: 'file',
        maxSelect: 1,
        maxSize: 40 * 1024 * 1024,
        mimeTypes: ['image/jpeg'],
        thumbs: ['96x96', '600x600'],
        protected: true,
      }),
    );
    songs.fields.add(new Field({ name: 'bandlink', type: 'url' }));
    app.save(songs);
  },
  (app) => {
    // статуса "отправлена" в прежней схеме нет: такие песни - "готова", чтобы их можно было
    // сохранять дальше
    for (const song of app.findRecordsByFilter('songs', 'status = "sent"', '', 0, 0)) {
      song.set('status', 'done');
      app.saveNoValidate(song);
    }
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.removeByName('release_cover');
    songs.fields.removeByName('bandlink');
    songs.fields.getByName('status').values = ['active', 'paused', 'done', 'released'];
    app.save(songs);
  },
);
