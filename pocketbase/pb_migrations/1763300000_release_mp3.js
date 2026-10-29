/// <reference path="../pb_data/types.d.ts" />

// Финальная версия трека - WAV или MP3.

const WAV = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];
const MP3 = ['audio/mpeg', 'audio/mp3'];

migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('release_audio').mimeTypes = [...WAV, ...MP3];
    app.save(songs);
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('release_audio').mimeTypes = WAV;
    app.save(songs);
  },
);
