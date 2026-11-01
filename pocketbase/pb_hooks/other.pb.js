/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/project-directions.js`).validateContent(
      event,
      'other'
    );
    require(`${__hooks}/lib/video.js`).validateStage(
      event,
      'projects',
      'project'
    );

    return event.next();
  });
}, 'other_stages');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateStage(
    event,
    'projects',
    'project'
  );

  return event.next();
}, 'other_stages');
onRecordCreateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/other.js`).validateNote(event);

    return event.next();
  });
}, 'notes');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/other.js`).validateNote(event);

  return event.next();
}, 'notes');
onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'other_stage'
  );

  return event.next();
}, 'other_stages');
