/// <reference path="../pb_data/types.d.ts" />

// У нового проекта сразу есть промо-план по умолчанию: его правят в настройках проекта.
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/promo.js`).seedPromo(e.app, e.record.id);
  return e.next();
}, 'projects');
