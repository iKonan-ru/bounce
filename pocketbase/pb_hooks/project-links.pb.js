/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  require(`${__hooks}/lib/project-links.js`).validateLinks(event);

  return event.next();
}, 'projects');

onRecordUpdateRequest((event) => {
  // Чужие настройки не блокируем из-за старой ссылки, пока список не меняют.
  if (
    JSON.stringify(event.record.get('links')) !==
    JSON.stringify(event.record.original().get('links'))
  ) {
    require(`${__hooks}/lib/project-links.js`).validateLinks(event);
  }

  return event.next();
}, 'projects');

onRecordCreateRequest(
  (event) => {
    if (!event.record.getString('direction')) {
      event.record.set('direction', 'music');
    }

    return event.next();
  },
  'stage_templates',
  'promo_templates'
);

onRecordValidate(
  (event) => {
    if (!event.record.getString('direction')) {
      event.record.set('direction', 'music');
    }

    require(`${__hooks}/lib/project-directions.js`).validateContent(
      event,
      event.record.getString('direction')
    );

    return event.next();
  },
  'stage_templates',
  'promo_templates'
);
