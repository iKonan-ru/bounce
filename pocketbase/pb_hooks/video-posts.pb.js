/// <reference path="../pb_data/types.d.ts" />

onRecordValidate((event) => {
  require(`${__hooks}/lib/video-posts.js`).validate(
    event.app,
    event.record,
    false
  );

  return event.next();
}, 'video_posts');
onRecordValidate((event) => {
  if (event.record.getString('direction') === 'video') {
    require(`${__hooks}/lib/video-posts.js`).validate(
      event.app,
      event.record,
      true
    );
  }

  return event.next();
}, 'promo_templates');
onRecordValidate((event) => {
  require(`${__hooks}/lib/video-posts.js`).validateMain(
    event.app,
    event.record
  );

  return event.next();
}, 'videos');

onRecordCreateRequest(
  (event) => {
    if (
      event.record.collection().name === 'video_posts' &&
      event.record.getString('source_template')
    ) {
      throw new BadRequestError('Используйте применение промо-плана.');
    }

    return event.app.runInTransaction((app) => {
      event.app = app;

      return event.next();
    });
  },
  'video_posts',
  'promo_templates'
);
onRecordUpdateRequest(
  (event) => {
    return event.app.runInTransaction((app) => {
      event.app = app;

      return event.next();
    });
  },
  'video_posts',
  'promo_templates',
  'videos'
);
onRecordDeleteRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    const video = app.findRecordById('videos', event.record.getString('video'));

    if (video.getString('main_publication') === event.record.id) {
      video.set('main_publication', '');
      app.save(video);
    }

    return event.next();
  });
}, 'video_posts');

onRecordUpdate((event) => {
  const result = event.next();
  const video = event.app.findRecordById(
    'videos',
    event.record.getString('video')
  );

  if (video.getString('main_publication') === event.record.id) {
    require(`${__hooks}/lib/video-posts.js`).refresh(event.app, video.id);
  }

  return result;
}, 'video_posts');
onRecordUpdate((event) => {
  const changed =
    event.record.getString('main_publication') !==
    event.record.original().getString('main_publication');
  const result = event.next();

  if (changed) {
    require(`${__hooks}/lib/video-posts.js`).refresh(
      event.app,
      event.record.id
    );
  }

  return result;
}, 'videos');
routerAdd(
  'POST',
  '/api/bounce/videos/{id}/promo',
  (event) => require(`${__hooks}/lib/video-promo.js`).applyPromo(event),
  $apis.requireAuth()
);
