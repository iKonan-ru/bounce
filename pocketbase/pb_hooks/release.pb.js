/// <reference path="../pb_data/types.d.ts" />

// Релиз песни: на лейбл нельзя отправить песню без текста и обложки для релиза; отправленная
// песня сама становится выпущенной в день релиза (при сохранении и по расписанию раз в час).

onRecordCreateRequest((e) => {
  const r = require(`${__hooks}/lib/release.js`);
  r.adjustStatus(e.record);
  r.checkSendable(e.record);
  return e.next();
}, 'songs');

onRecordUpdateRequest((e) => {
  const r = require(`${__hooks}/lib/release.js`);
  r.adjustStatus(e.record);
  r.checkSendable(e.record);
  return e.next();
}, 'songs');

cronAdd('bounce-release', '7 * * * *', () => {
  const r = require(`${__hooks}/lib/release.js`);
  const due = $app.findRecordsByFilter(
    'songs',
    'status = "sent" && target_release != "" && target_release <= {:day}',
    '',
    0,
    0,
    { day: `${r.today()} 23:59:59.999Z` },
  );
  for (const song of due) {
    song.set('status', 'released');
    $app.save(song);
  }
});
