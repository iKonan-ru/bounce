/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateVideo(event);

  return event.next();
}, 'videos');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateVideo(event);

  return event.next();
}, 'videos');
onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateStage(event);

  return event.next();
}, 'video_stages');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateStage(event);

  return event.next();
}, 'video_stages');
onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateNote(event);

  return event.next();
}, 'notes');
onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/video.js`).validateNote(event);

  return event.next();
}, 'notes');
onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'video'
  );

  return event.next();
}, 'videos');
onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'video_stage'
  );

  return event.next();
}, 'video_stages');
routerAdd(
  'POST',
  '/api/bounce/videos/{id}/template',
  (event) => {
    return require(`${__hooks}/lib/video.js`).applyTemplate(event);
  },
  $apis.requireAuth()
);
