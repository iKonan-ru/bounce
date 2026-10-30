/// <reference path="../pb_data/types.d.ts" />

// Релиз песни: обложка для релиза - JPEG ровно 3000x3000; на лейбл нельзя отправить песню без
// текста и обложки для релиза, у отправленной нельзя убрать финальную версию трека; отправленная
// песня сама становится выпущенной в день релиза (при сохранении и по расписанию раз в час).

onRecordCreateRequest((event) => {
  const isEnabled = require(`${__hooks}/lib/music-release.js`).validateSong(
    event.app,
    event.record
  );

  if (!isEnabled) {
    return event.next();
  }

  const release = require(`${__hooks}/lib/release.js`);
  release.validateReleaseCover(event.record);
  release.adjustStatus(event.record);
  release.validateSendable(event.record);

  return event.next();
}, 'songs');

onRecordUpdateRequest((event) => {
  const isEnabled = require(`${__hooks}/lib/music-release.js`).validateSong(
    event.app,
    event.record
  );

  if (!isEnabled) {
    return event.next();
  }

  const release = require(`${__hooks}/lib/release.js`);
  release.validateReleaseCover(event.record);
  release.adjustStatus(event.record);
  release.validateSendable(event.record);
  release.validateKeepsAudio(event.record);

  return event.next();
}, 'songs');

// раз в час, в 7 минут: отправленные песни, у которых настал день релиза, - выпущены
cronAdd('bounce-release', '7 * * * *', () => {
  require(`${__hooks}/lib/release.js`).releaseDueSongs($app);
});
