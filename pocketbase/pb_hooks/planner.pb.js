/// <reference path="../pb_data/types.d.ts" />

// Планировщик: время выполнения задачи ставит сервер, контекст задачи и песня публикации
// принадлежат их проекту; исполнители этапов, задач и публикаций работают в проекте.

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateTaskContext(event.app, event.record);
  planner.validateAssignees(
    event.app,
    event.record,
    event.record.getString('project')
  );
  planner.stampDoneAt(event.record);

  return event.next();
}, 'tasks');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateTaskContext(event.app, event.record);
  planner.validateAssignees(
    event.app,
    event.record,
    event.record.getString('project')
  );
  planner.stampDoneAt(event.record);

  return event.next();
}, 'tasks');

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(
    event.app,
    event.record,
    event.record.getString('project')
  );

  return event.next();
}, 'posts');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  planner.validateSong(event.app, event.record);
  planner.validateAssignees(
    event.app,
    event.record,
    event.record.getString('project')
  );

  return event.next();
}, 'posts');

onRecordCreateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  const projectId = planner.getStageProject(event.app, event.record);
  planner.validateAssignees(event.app, event.record, projectId);

  // У старых этапов подэтапы могут быть без done: проверяем только изменения
  const isSubstepsChanged =
    event.record.isNew() ||
    event.record.getString('substeps') !==
      event.record.original().getString('substeps');

  if (isSubstepsChanged) {
    require(`${__hooks}/lib/video.js`).validateSubsteps(event.record);
  }

  return event.next();
}, 'song_stages');

onRecordUpdateRequest((event) => {
  const planner = require(`${__hooks}/lib/planner.js`);
  const projectId = planner.getStageProject(event.app, event.record);
  planner.validateAssignees(event.app, event.record, projectId);

  // У старых этапов подэтапы могут быть без done: проверяем только изменения
  const isSubstepsChanged =
    event.record.isNew() ||
    event.record.getString('substeps') !==
      event.record.original().getString('substeps');

  if (isSubstepsChanged) {
    require(`${__hooks}/lib/video.js`).validateSubsteps(event.record);
  }

  return event.next();
}, 'song_stages');
