/// <reference path="../pb_data/types.d.ts" />

// Заметки: песня, которая выросла из заметки, - из того же проекта.

onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/notes.js`).validateBecameSong(
    event.app,
    event.record
  );

  return event.next();
}, 'notes');

onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/notes.js`).validateBecameSong(
    event.app,
    event.record
  );

  return event.next();
}, 'notes');
