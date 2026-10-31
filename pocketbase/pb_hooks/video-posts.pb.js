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
  if (event.record.getString('main_publication')) {
    throw new BadRequestError('Каждая публикация видео имеет свою дату.');
  }

  return event.next();
}, 'videos');

onRecordCreateRequest(
  (event) => {
    if (
      event.record.collection().name === 'video_posts' &&
      event.record.getString('source_template')
    ) {
      throw new BadRequestError('Создайте самостоятельную публикацию видео.');
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
// Старый клиент получает явный отказ, а не создает публикации из архивного промо-плана.
routerAdd(
  'POST',
  '/api/bounce/videos/{id}/promo',
  () => {
    throw new BadRequestError(
      'Промо-план видео больше не используется. Добавьте публикацию в карточке видео.'
    );
  },
  $apis.requireAuth()
);
