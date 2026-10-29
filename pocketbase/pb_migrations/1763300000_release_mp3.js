/// <reference path="../pb_data/types.d.ts" />

// Финальная версия трека - WAV или MP3.

/** Типы файла WAV */
const WAV_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];

/** Типы файла MP3 */
const MP3_TYPES = ['audio/mpeg', 'audio/mp3'];

migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('release_audio').mimeTypes = [
      ...WAV_TYPES,
      ...MP3_TYPES,
    ];
    app.save(songs);
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('release_audio').mimeTypes = WAV_TYPES;
    app.save(songs);
  }
);
