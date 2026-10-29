/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер, песня задачи и публикации - из их
// проекта, исполнители этапов, задач и публикаций - из тех, кто работает в проекте.

onRecordCreateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.checkAssignees(e.app, e.record, e.record.getString('project'));
  p.stampDone(e.record);
  return e.next();
}, 'tasks');

onRecordUpdateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.checkAssignees(e.app, e.record, e.record.getString('project'));
  p.stampDone(e.record);
  return e.next();
}, 'tasks');

onRecordCreateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.checkAssignees(e.app, e.record, e.record.getString('project'));
  return e.next();
}, 'posts');

onRecordUpdateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkSong(e.app, e.record);
  p.checkAssignees(e.app, e.record, e.record.getString('project'));
  return e.next();
}, 'posts');

onRecordCreateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkAssignees(e.app, e.record, p.stageProject(e.app, e.record));
  return e.next();
}, 'song_stages');

onRecordUpdateRequest((e) => {
  const p = require(`${__hooks}/lib/planner.js`);
  p.checkAssignees(e.app, e.record, p.stageProject(e.app, e.record));
  return e.next();
}, 'song_stages');
