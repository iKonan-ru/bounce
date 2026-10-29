/// <reference path="../pb_data/types.d.ts" />

// Роли в проекте: человек не может быть в проекте сразу редактором и наблюдателем.

onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/roles.js`).validateRoles(event.record);

  return event.next();
}, 'projects');

onRecordUpdateRequest((event) => {
  require(`${__hooks}/lib/roles.js`).validateRoles(event.record);

  return event.next();
}, 'projects');
