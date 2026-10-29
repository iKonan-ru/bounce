/// <reference path="../pb_data/types.d.ts" />

// "Не начата" -> "в работе": по первому начатому этапу песни.

onRecordAfterCreateSuccess((event) => {
  require(`${__hooks}/lib/song-status.js`).startSong(event.app, event.record);
  event.next();
}, 'song_stages');

onRecordAfterUpdateSuccess((event) => {
  require(`${__hooks}/lib/song-status.js`).startSong(event.app, event.record);
  event.next();
}, 'song_stages');
