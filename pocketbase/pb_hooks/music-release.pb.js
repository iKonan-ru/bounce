/// <reference path="../pb_data/types.d.ts" />

// Старый клиент ещё не знает переключателя и продолжает создавать полные музыкальные проекты.
onRecordCreateRequest((event) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      event.requestInfo().body,
      'music_release_enabled'
    )
  ) {
    event.record.set('music_release_enabled', true);
  }

  return event.next();
}, 'projects');

onRecordCreateRequest(
  (event) => {
    require(`${__hooks}/lib/music-release.js`).validatePromotion(
      event.app,
      event.record
    );

    return event.next();
  },
  'posts',
  'promo_templates'
);

onRecordUpdateRequest(
  (event) => {
    require(`${__hooks}/lib/music-release.js`).validatePromotion(
      event.app,
      event.record
    );

    return event.next();
  },
  'posts',
  'promo_templates'
);

onRecordDeleteRequest(
  (event) => {
    require(`${__hooks}/lib/music-release.js`).validatePromotion(
      event.app,
      event.record
    );

    return event.next();
  },
  'posts',
  'promo_templates'
);
