/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер, песня задачи - из её проекта.

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
