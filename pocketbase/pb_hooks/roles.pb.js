/// <reference path="../pb_data/types.d.ts" />

// Роли в проекте: человек не может быть в проекте сразу редактором и наблюдателем.

onRecordCreateRequest((e) => {
  require(`${__hooks}/lib/roles.js`).checkRoles(e.record);
  return e.next();
}, 'projects');

onRecordUpdateRequest((e) => {
  require(`${__hooks}/lib/roles.js`).checkRoles(e.record);
  return e.next();
}, 'projects');
