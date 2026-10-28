/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер, песня задачи и публикации - из их
// проекта.

onRecordCreateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.stampDone(e.record);
  return e.next();
}, 'tasks');

onRecordUpdateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.stampDone(e.record);
  return e.next();
}, 'tasks');

onRecordCreateRequest((e) => {
  require(`${__hooks}/lib/planner.js`).checkSong(e.app, e.record);
  return e.next();
}, 'posts');

onRecordUpdateRequest((e) => {
  require(`${__hooks}/lib/planner.js`).checkSong(e.app, e.record);
  return e.next();
}, 'posts');
