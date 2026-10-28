/// <reference path="../pb_data/types.d.ts" />

// "Не начата" -> "в работе": по первому начатому этапу песни.

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/song-status.js`).startSong(e.app, e.record);
  e.next();
}, 'song_stages');

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/lib/song-status.js`).startSong(e.app, e.record);
  e.next();
}, 'song_stages');
