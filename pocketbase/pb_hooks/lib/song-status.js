// Песня сама переходит из "не начата" в "в работе", когда её этап начали или закончили
// (pb_hooks/song-status.pb.js).

/** Статусы этапа, с которыми песня уже в работе */
const STARTED_STAGE_STATUSES = ['in_progress', 'done'];

/** Песня "не начата": её переводят в работу */
const NOT_STARTED_STATUS = 'not_started';

/** Песня в работе */
const ACTIVE_STATUS = 'active';

/** Перевести песню этапа в работу, если этап начат или готов, а песня ещё не начата */
function startSong(app, stage) {
  if (!STARTED_STAGE_STATUSES.includes(stage.getString('status'))) {
    return;
  }

  let song = null;
  try {
    song = app.findRecordById('songs', stage.getString('song'));
  } catch (_error) {
    return;
  }

  if (song.getString('status') !== NOT_STARTED_STATUS) {
    return;
  }

  song.set('status', ACTIVE_STATUS);
  app.save(song);
}

module.exports = { startSong };
