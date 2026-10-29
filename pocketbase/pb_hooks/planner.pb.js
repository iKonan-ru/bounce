/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер, песня задачи и публикации - из их
// проекта, исполнители этапов, задач и публикаций - из тех, кто работает в проекте.

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(event.app, event.record, event.record.getString('project'));
  planner.stampDoneAt(event.record);
  return event.next();
}, 'tasks');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(event.app, event.record, event.record.getString('project'));
  planner.stampDoneAt(event.record);
  return event.next();
}, 'tasks');

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(event.app, event.record, event.record.getString('project'));
  return event.next();
}, 'posts');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(event.app, event.record, event.record.getString('project'));
  return event.next();
}, 'posts');

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  const projectId = planner.getStageProject(event.app, event.record);
  planner.validateAssignees(event.app, event.record, projectId);
  return event.next();
}, 'song_stages');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  const projectId = planner.getStageProject(event.app, event.record);
  planner.validateAssignees(event.app, event.record, projectId);
  return event.next();
}, 'song_stages');
