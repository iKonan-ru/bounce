/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  const privacy = require(`${__hooks}/lib/note-visibility.js`);
  privacy.validateVisibility(event);
  privacy.validateContext(event);

  return event.next();
}, 'notes');

onRecordUpdateRequest((event) => {
  const privacy = require(`${__hooks}/lib/note-visibility.js`);
  privacy.validateVisibility(event);
  privacy.validateContext(event);
  const changed = ['visibility', 'recipients'].some(
    (field) =>
      JSON.stringify(event.record.get(field)) !==
      JSON.stringify(event.record.original().get(field))
  );
  const result = event.next();

  if (changed && event.record.getString('project')) {
    const project = event.app.findRecordById(
      'projects',
      event.record.getString('project')
    );
    privacy.notifyAccess(event.app, privacy.getMembers(project));
  }

  return result;
}, 'notes');

onRecordUpdateRequest((event) => {
  const privacy = require(`${__hooks}/lib/note-visibility.js`);
  const before = privacy.getMembers(event.record.original());
  const after = privacy.getMembers(event.record);
  const result = event.next();

  if (JSON.stringify(before) !== JSON.stringify(after)) {
    privacy.notifyAccess(event.app, [...before, ...after]);
  }

  return result;
}, 'projects');

onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'song'
  );

  return event.next();
}, 'songs');

onRecordDeleteRequest((event) => {
  require(`${__hooks}/lib/note-visibility.js`).protectNestedNotes(
    event,
    'stage'
  );

  return event.next();
}, 'song_stages');
