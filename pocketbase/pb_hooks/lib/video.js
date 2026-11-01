/** Связь с песней и материалы видео проверяются также при прямом запросе */
function validateVideo(event) {
  const record = event.record;

  if (!record.getString('status')) {
    record.set('status', 'not_started');
  }

  const project = event.app.findRecordById(
    'projects',
    record.getString('project')
  );

  if (!project.getStringSlice('directions').includes('video')) {
    throw new BadRequestError('Сначала включите видео в настройках проекта.');
  }

  const songId = record.getString('song');

  if (songId) {
    const song = event.app.findRecordById('songs', songId);

    if (song.getString('project') !== record.getString('project')) {
      throw new BadRequestError('Песня должна быть из этого проекта.');
    }
  }

  const links = JSON.parse(record.getString('materials') || '[]') || [];

  if (
    !Array.isArray(links) ||
    links.some(
      (link) =>
        !link ||
        typeof link.name !== 'string' ||
        !link.name.trim() ||
        link.name.length > 120 ||
        typeof link.url !== 'string' ||
        !/^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(link.url)
    )
  ) {
    throw new BadRequestError(
      'У материала должны быть название и адрес http:// или https://.'
    );
  }
}

/** Исполнители этапа принадлежат проекту; назначение не меняет их права */
function validateStage(event, collection = 'videos', relation = 'video') {
  const stage = event.record;

  if (!stage.getString('status')) {
    stage.set('status', 'not_started');
  }

  const projectId =
    relation === 'project'
      ? stage.getString('project')
      : event.app
          .findRecordById(collection, stage.getString(relation))
          .getString('project');
  require(`${__hooks}/lib/planner.js`).validateAssignees(
    event.app,
    stage,
    projectId
  );

  const substeps = JSON.parse(stage.getString('substeps') || '[]') || [];
  const ids = {};

  if (
    !Array.isArray(substeps) ||
    substeps.some((item) => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !item.id ||
        ids[item.id] ||
        typeof item.title !== 'string' ||
        !item.title.trim() ||
        item.title.length > 200 ||
        typeof item.done !== 'boolean'
      ) {
        return true;
      }

      ids[item.id] = true;

      return false;
    })
  ) {
    throw new BadRequestError('Проверьте названия и отметки подэтапов.');
  }
}

/** Контекст видеозаметки не смешивается с музыкальным */
function validateNote(event) {
  const note = event.record;
  const videoId = note.getString('video');
  const stageId = note.getString('video_stage');
  const isMoved = ['video', 'video_stage'].some(
    (field) => note.getString(field) !== note.original().getString(field)
  );

  if (!note.isNew() && isMoved && (videoId || stageId)) {
    throw new BadRequestError(
      'Заметку можно перенести только на уровень проекта.'
    );
  }

  if (!videoId && !stageId) {
    return;
  }

  if (note.getString('song') || note.getString('stage')) {
    throw new BadRequestError('Выберите один контекст заметки.');
  }

  if (!videoId) {
    throw new BadRequestError('Выберите видео для заметки.');
  }

  const video = event.app.findRecordById('videos', videoId);

  if (video.getString('project') !== note.getString('project')) {
    throw new BadRequestError('Видео должно быть из этого проекта.');
  }

  if (stageId) {
    const stage = event.app.findRecordById('video_stages', stageId);

    if (stage.getString('video') !== videoId) {
      throw new BadRequestError('Этап должен относиться к выбранному видео.');
    }
  }
}
module.exports = { validateVideo, validateStage, validateNote };

/** Явное применение к пустой карточке: повторный запрос не создает дубликаты */
function applyTemplate(event) {
  const id = event.request.pathValue('id');

  return event.app.runInTransaction((app) => {
    const video = app.findRecordById('videos', id);
    const project = app.findRecordById('projects', video.getString('project'));

    if (
      !event.auth.getBool('totp_enabled') ||
      event.auth.getBool('disabled') ||
      (project.getString('owner') !== event.auth.id &&
        !project.getStringSlice('editors').includes(event.auth.id))
    ) {
      throw new ForbiddenError('Добавлять этапы может редактор проекта.');
    }

    if (
      app.findRecordsByFilter('video_stages', 'video = {:id}', '', 1, 0, { id })
        .length > 0
    ) {
      throw new BadRequestError(
        'В видео уже есть этапы. Шаблон применяется только к пустой карточке.'
      );
    }

    const preset = event.requestInfo().body.preset;
    let steps = [];

    if (preset === 'full') {
      steps = [
        {
          title: 'Идея и сценарий',
          substeps: [
            { title: 'Идея' },
            { title: 'Сценарий' },
            { title: 'План кадров' },
          ],
        },
        {
          title: 'Подготовка',
          substeps: [{ title: 'Место и участники' }, { title: 'Оборудование' }],
        },
        { title: 'Съемка', substeps: [] },
        {
          title: 'Монтаж',
          substeps: [{ title: 'Черновой монтаж' }, { title: 'Звук и цвет' }],
        },
        { title: 'Финальная версия', substeps: [] },
      ];
    } else if (preset === 'short') {
      steps = [
        { title: 'Идея', substeps: [] },
        { title: 'Съемка', substeps: [] },
        { title: 'Монтаж', substeps: [] },
      ];
    } else if (preset === 'project') {
      steps = app
        .findRecordsByFilter(
          'stage_templates',
          'project = {:project} && direction = "video"',
          'position',
          0,
          0,
          { project: project.id }
        )
        .map((step) => ({
          title: step.getString('title'),
          substeps: JSON.parse(step.getString('substeps') || '[]') || [],
        }));
    } else {
      throw new BadRequestError('Выберите шаблон этапов.');
    }

    if (steps.length === 0) {
      throw new BadRequestError('В шаблоне проекта пока нет этапов.');
    }

    for (const [position, step] of steps.entries()) {
      const stage = new Record(app.findCollectionByNameOrId('video_stages'));
      stage.set('video', id);
      stage.set('title', step.title);
      stage.set('status', 'not_started');
      stage.set('position', position);
      stage.set(
        'substeps',
        step.substeps.map((item) => ({
          id: $security.randomString(15),
          title: item.title,
          done: false,
        }))
      );
      app.save(stage);
    }

    return event.json(200, { added: steps.length });
  });
}
module.exports.applyTemplate = applyTemplate;
