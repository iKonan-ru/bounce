// Задачи, публикации и исполнители этапов (pb_hooks/planner.pb.js).

/** Текст отказа: песня из другого проекта */
const WRONG_PROJECT_MESSAGE = 'Песня из другого проекта.';

/** Запись по id; нет такой - null */
function findRecord(app, collection, id) {
  try {
    return app.findRecordById(collection, id);
  } catch (_error) {
    return null;
  }
}

/**
 * Когда задачу отметили выполненной - время отметки, сняли отметку - пусто
 *
 * По нему показываются недавно выполненные
 */
function stampDoneAt(task) {
  if (!task.getBool('done')) {
    task.set('done_at', '');

    return;
  }

  if (!task.getString('done_at')) {
    task.set('done_at', new Date().toISOString());
  }
}

/** Песня задачи или публикации - только из того же проекта */
function validateSong(app, record) {
  const songId = record.getString('song');

  if (!songId) {
    return;
  }

  const song = findRecord(app, 'songs', songId);

  if (song && song.getString('project') === record.getString('project')) {
    return;
  }

  throw new BadRequestError(WRONG_PROJECT_MESSAGE, {
    song: new ValidationError('wrong_project', WRONG_PROJECT_MESSAGE),
  });
}

/** У задачи один контекст, из ее проекта и включенного направления */
function validateTaskContext(app, task) {
  const songId = task.getString('song');
  const videoId = task.getString('video');

  if (songId && videoId) {
    throw new BadRequestError('Выберите песню, видео или проект целиком.');
  }

  if (!songId && !videoId) {
    return;
  }

  const field = songId ? 'song' : 'video';
  const media = findRecord(app, songId ? 'songs' : 'videos', songId || videoId);
  const projectId = task.getString('project');

  if (!media || media.getString('project') !== projectId) {
    const message = songId
      ? WRONG_PROJECT_MESSAGE
      : 'Видео из другого проекта.';
    throw new BadRequestError(message, {
      [field]: new ValidationError('wrong_project', message),
    });
  }

  const project = findRecord(app, 'projects', projectId);
  const direction = songId ? 'music' : 'video';

  if (!project || !project.getStringSlice('directions').includes(direction)) {
    throw new BadRequestError(
      'Сначала включите направление в настройках проекта.',
      {
        [field]: new ValidationError(
          'direction_disabled',
          'Направление отключено.'
        ),
      }
    );
  }
}

/** Go-срез из записи - в обычный массив */
function convertSliceToArray(slice) {
  const items = [];
  for (const item of slice) {
    items.push(item);
  }

  return items;
}

/** Кого можно назначить: участники проекта, кроме наблюдателей и комментаторов */
function getProjectWorkers(app, projectId) {
  const project = findRecord(app, 'projects', projectId);

  if (!project) {
    return [];
  }

  return [
    project.getString('owner'),
    ...convertSliceToArray(project.getStringSlice('editors')),
    ...convertSliceToArray(project.getStringSlice('contributors')),
  ];
}

/**
 * Исполнители этапа, задачи или публикации - только те, кто работает в проекте
 *
 * Проверяются лишь добавленные по сравнению с прежним значением записи: исполнитель, которого
 * потом перевели в наблюдатели или убрали из проекта, остаётся назначенным, пока его не снимут, и
 * не мешает править запись
 */
function validateAssignees(app, record, projectId) {
  if (!projectId && record.collection().name === 'tasks') {
    const author = record.getString('author');
    const assignees = convertSliceToArray(record.getStringSlice('assignees'));

    if (assignees.some((id) => id !== author)) {
      throw new BadRequestError(
        'Личную задачу нельзя назначить другому пользователю.'
      );
    }

    record.set('assignees', [author]);

    return;
  }

  const before = convertSliceToArray(
    record.original().getStringSlice('assignees')
  );
  const added = convertSliceToArray(record.getStringSlice('assignees')).filter(
    (userId) => !before.includes(userId)
  );

  if (added.length === 0) {
    return;
  }

  const workers = getProjectWorkers(app, projectId);
  const hasOutsider = added.some((userId) => !workers.includes(userId));

  if (!hasOutsider) {
    return;
  }

  throw new BadRequestError(
    'Исполнителем можно назначить участника проекта, кроме наблюдателя и комментатора.',
    {
      assignees: new ValidationError(
        'not_worker',
        'Этот человек не работает в проекте.'
      ),
    }
  );
}

/** Проект этапа - через его песню; песни нет - пусто */
function getStageProject(app, stage) {
  const song = findRecord(app, 'songs', stage.getString('song'));

  if (!song) {
    return '';
  }

  return song.getString('project');
}

module.exports = {
  stampDoneAt,
  validateSong,
  validateTaskContext,
  validateAssignees,
  getStageProject,
};
