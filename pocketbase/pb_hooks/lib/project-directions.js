/** Для запрета достаточно одной записи; содержимое не возвращается */
function getContentCount(app, collection, filter, params) {
  return app.findRecordsByFilter(collection, filter, '', 1, 0, params).length;
}

/** Причина блокировки без раскрытия названий и содержимого чужих личных заметок */
function getBlockers(app, project) {
  const result = { music: null, video: null };
  const projectId = project.id;
  for (const direction of ['music', 'video']) {
    const collection = direction === 'music' ? 'songs' : 'videos';
    const cards = getContentCount(app, collection, 'project = {:project}', {
      project: projectId,
    });
    const stages = getContentCount(
      app,
      'stage_templates',
      'project = {:project} && direction = {:direction}',
      { project: projectId, direction }
    );
    const promos = getContentCount(
      app,
      'promo_templates',
      'project = {:project} && direction = {:direction}',
      { project: projectId, direction }
    );
    const posts = getContentCount(
      app,
      direction === 'music' ? 'posts' : 'video_posts',
      'project = {:project}',
      { project: projectId }
    );
    const links = JSON.parse(project.getString('links') || '[]') || [];
    const hasLinks = links.some((link) =>
      (link.directions || ['music']).includes(direction)
    );

    if (cards) {
      result[direction] = {
        message:
          direction === 'music'
            ? 'Нельзя отключить: есть песни.'
            : 'Нельзя отключить: есть видео.',
        target: 'cards',
      };
    } else if (
      !stages &&
      promos &&
      direction === 'music' &&
      !project.getBool('music_release_enabled')
    ) {
      result[direction] = {
        message: 'Есть промо-шаблон. Для удаления включите выпуск песен.',
        target: 'release',
      };
    } else if (stages || promos) {
      result[direction] = {
        message: 'Нельзя отключить: есть шаблоны.',
        target: 'templates',
      };
    } else if (posts) {
      result[direction] = {
        message: 'Нельзя отключить: есть публикации.',
        target: 'posts',
      };
    } else if (hasLinks) {
      result[direction] = {
        message: 'Направление используется в ссылках.',
        target: 'links',
      };
    }
  }

  return result;
}

/** Проверка отключения выполняется в одной транзакции с сохранением */
function validateChange(event) {
  const current = event.record.getStringSlice('directions');
  const previous = event.record.original().getStringSlice('directions');

  if (current.length === 0) {
    throw new BadRequestError('Оставьте хотя бы одно направление.');
  }

  const removed = previous.filter((direction) => !current.includes(direction));

  if (removed.length === 0) {
    return;
  }

  const blockers = getBlockers(event.app, event.record);

  if (removed.some((direction) => blockers[direction])) {
    throw new BadRequestError(
      'Нельзя отключить направление, пока в нем есть наполнение. Личные заметки могут перенести в проект только их авторы.'
    );
  }
}

/** Новое наполнение создается только для включенного направления */
function validateContent(event, direction) {
  const project = event.app.findRecordById(
    'projects',
    event.record.getString('project')
  );

  if (!project.getStringSlice('directions').includes(direction)) {
    throw new BadRequestError(
      'Сначала включите направление в настройках проекта.'
    );
  }
}
module.exports = { getBlockers, validateChange, validateContent };
