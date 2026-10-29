/// <reference path="../pb_data/types.d.ts" />

// У нового проекта сразу есть промо-план по умолчанию: его правят в настройках проекта.
onRecordAfterCreateSuccess((event) => {
  require(`${__hooks}/lib/promo.js`).seedPromo(event.app, event.record.id);
  return event.next();
}, 'projects');
