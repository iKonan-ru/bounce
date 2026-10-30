/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      event.requestInfo().body,
      'directions'
    )
  ) {
    event.record.set('directions', ['music']);
  }

  return event.next();
}, 'projects');

onRecordValidate((event) => {
  if (event.record.getStringSlice('directions').length === 0) {
    throw new BadRequestError('Выберите хотя бы одно направление проекта.');
  }

  return event.next();
}, 'projects');

onRecordUpdateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/project-directions.js`).validateChange(event);

    return event.next();
  });
}, 'projects');

onRecordCreateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/project-directions.js`).validateContent(
      event,
      'music'
    );

    return event.next();
  });
}, 'songs');

onRecordCreateRequest((event) => {
  return event.app.runInTransaction((app) => {
    event.app = app;
    require(`${__hooks}/lib/project-directions.js`).validateContent(
      event,
      'video'
    );

    return event.next();
  });
}, 'videos');

routerAdd(
  'GET',
  '/api/bounce/projects/{id}/directions',
  (event) => {
    const project = event.app.findRecordById(
      'projects',
      event.request.pathValue('id')
    );

    if (
      event.auth.id !== project.getString('owner') ||
      !event.auth.getBool('totp_enabled') ||
      event.auth.getBool('disabled')
    ) {
      throw new ForbiddenError('Настройки направлений доступны владельцу.');
    }

    return event.json(
      200,
      require(`${__hooks}/lib/project-directions.js`).getBlockers(
        event.app,
        project
      )
    );
  },
  $apis.requireAuth()
);
