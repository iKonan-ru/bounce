/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/project-tasks.js`).validateTask(event);

    return event.next();
  });
}, 'project_tasks');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/project-tasks.js`).validateTask(event);

  return event.next();
}, 'project_tasks');
onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'project_task'
  );

  return event.next();
}, 'project_tasks');
onRecordAfterCreateSuccess((event) => {
  require(`${__hooks}/lib/project-tasks.js`).startTask(event.app, event.record);
  event.next();
}, 'other_stages');
onRecordAfterUpdateSuccess((event) => {
  require(`${__hooks}/lib/project-tasks.js`).startTask(event.app, event.record);
  event.next();
}, 'other_stages');
