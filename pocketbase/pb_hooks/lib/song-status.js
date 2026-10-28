// Песня сама переходит из "не начата" в "в работе", когда её этап начали или закончили
// (pb_hooks/song-status.pb.js).

function startSong(app, stage) {
  const st = stage.getString('status');
  if (st !== 'in_progress' && st !== 'done') return;
  let song = null;
  try {
    song = app.findRecordById('songs', stage.getString('song'));
  } catch (_e) {
    return;
  }
  if (song.getString('status') !== 'not_started') return;
  song.set('status', 'active');
  app.save(song);
}

module.exports = { startSong };
