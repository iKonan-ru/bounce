/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер.

onRecordCreateRequest((e) => {
  require(`${__hooks}/lib/planner.js`).stampDone(e.record);
  return e.next();
}, 'tasks');

onRecordUpdateRequest((e) => {
  require(`${__hooks}/lib/planner.js`).stampDone(e.record);
  return e.next();
}, 'tasks');
