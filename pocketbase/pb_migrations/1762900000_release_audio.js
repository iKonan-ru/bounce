/// <reference path="../pb_data/types.d.ts" />

// Финальная версия трека в блоке релиза: один WAV по желанию, хранится в исходном виде (закрытый
// файл, как обложка для релиза). Исходное имя файла - в release_audio_name: PocketBase убирает
// из имён кириллицу.

/** Типы файла WAV */
const WAV_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];

migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    if (!songs.fields.getByName('release_audio')) {
      songs.fields.add(
        new Field({
          name: 'release_audio',
          type: 'file',
          maxSelect: 1,
          maxSize: 300 * 1024 * 1024,
          mimeTypes: WAV_TYPES,
          protected: true,
        }),
      );
    }
    if (!songs.fields.getByName('release_audio_name')) {
      songs.fields.add(new Field({ name: 'release_audio_name', type: 'text', max: 300 }));
    }
    app.save(songs);
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.removeByName('release_audio');
    songs.fields.removeByName('release_audio_name');
    app.save(songs);
  },
);
