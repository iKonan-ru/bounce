/// <reference path="../pb_data/types.d.ts" />

// Заметки: песня, которая выросла из заметки, - из того же проекта.

onRecordCreateRequest((e) => {
  require(`${__hooks}/lib/notes.js`).checkBecameSong(e.app, e.record);
  return e.next();
}, 'notes');

onRecordUpdateRequest((e) => {
  require(`${__hooks}/lib/notes.js`).checkBecameSong(e.app, e.record);
  return e.next();
}, 'notes');
