/// <reference path="../pb_data/types.d.ts" />

// Релиз песни: обложка для релиза - JPEG ровно 3000x3000; на лейбл нельзя отправить песню без
// текста и обложки для релиза, у отправленной нельзя убрать финальную версию трека; отправленная
// песня сама становится выпущенной в день релиза (при сохранении и по расписанию раз в час).

onRecordCreateRequest((event) => {
  const release = require(`${__hooks}/lib/release.js`);
  release.validateReleaseCover(event.record);
  release.adjustStatus(event.record);
  release.validateSendable(event.record);

  return event.next();
}, 'songs');

onRecordUpdateRequest((event) => {
  const release = require(`${__hooks}/lib/release.js`);
  release.validateReleaseCover(event.record);
  release.adjustStatus(event.record);
  release.validateSendable(event.record);
  release.validateKeepsAudio(event.record);

  return event.next();
}, 'songs');

// раз в час, в 7 минут: отправленные песни, у которых настал день релиза, - выпущены
cronAdd('bounce-release', '7 * * * *', () => {
  const release = require(`${__hooks}/lib/release.js`);
  const dueSongs = $app.findRecordsByFilter(
    'songs',
    'status = "sent" && target_release != "" && target_release <= {:day}',
    '',
    0,
    0,
    { day: `${release.getToday()} 23:59:59.999Z` }
  );
  for (const song of dueSongs) {
    song.set('status', release.RELEASED_STATUS);
    $app.save(song);
  }
});
