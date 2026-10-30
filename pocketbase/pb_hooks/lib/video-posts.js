/** Аккаунт принадлежит проекту и включен для видео */
function validateAccount(app, record) {
  const project = app.findRecordById('projects', record.getString('project'));
  const links = JSON.parse(project.getString('links') || '[]') || [];

  if (
    !project.getStringSlice('directions').includes('video') ||
    !links.some(
      (link) =>
        link.id === record.getString('account') &&
        link.directions.includes('video')
    )
  ) {
    throw new BadRequestError(
      'Выберите аккаунт видео из ссылок этого проекта.'
    );
  }
}

/** Календарный день в сохраненном часовом поясе, а не в поясе сервера */
function getSchedule(app, post) {
  let day = post.getString('date').slice(0, 10);
  const timezone = post.getString('timezone');

  if (post.getString('anchor') === 'main') {
    const video = app.findRecordById('videos', post.getString('video'));
    const mainId = video.getString('main_publication');

    if (!mainId) {
      return '';
    }

    const main = app.findRecordById('video_posts', mainId);

    if (!main.getString('scheduled_at')) {
      return '';
    }

    day = new DateTime(main.getString('scheduled_at'))
      .time()
      .in(new Timezone(timezone))
      .format('2006-01-02');
    const shifted = new Date(`${day}T12:00:00.000Z`);
    shifted.setUTCDate(shifted.getUTCDate() + post.getInt('offset'));
    day = shifted.toISOString().slice(0, 10);
  }

  if (!day) {
    return '';
  }

  const local = `${day} ${post.getString('time') || '12:00'}`;
  const result = new DateTime(`${local}:00`, timezone);

  if (
    result.time().in(new Timezone(timezone)).format('2006-01-02 15:04') !==
    local
  ) {
    throw new BadRequestError(
      'Такого времени нет из-за перевода часов. Выберите другое время.'
    );
  }

  return result.string();
}

/** Общие поля видеопубликации и ее шаблона */
function validate(app, record, isTemplate) {
  validateAccount(app, record);

  if (!record.getString('anchor')) {
    record.set('anchor', 'date');
  }

  const zone = record.getString('timezone');

  if (!zone || new Timezone(zone).string() !== zone) {
    throw new BadRequestError(
      'Не удалось определить часовой пояс. Обновите страницу.'
    );
  }

  if (isTemplate) {
    return;
  }

  const video = app.findRecordById('videos', record.getString('video'));

  if (video.getString('project') !== record.getString('project')) {
    throw new BadRequestError('Видео должно быть из этого проекта.');
  }

  if (
    record.getString('url') &&
    !/^https?:\/\//i.test(record.getString('url'))
  ) {
    throw new BadRequestError(
      'Ссылка на публикацию должна начинаться с http:// или https://.'
    );
  }

  if (!record.getString('status')) {
    record.set('status', 'idea');
  }

  if (
    video.getString('main_publication') === record.id &&
    record.getString('anchor') !== 'date'
  ) {
    throw new BadRequestError('У основной публикации должна быть своя дата.');
  }

  require(`${__hooks}/lib/planner.js`).validateAssignees(
    app,
    record,
    record.getString('project')
  );
  record.set('scheduled_at', getSchedule(app, record));
}

/** Основная публикация не ссылается на другое видео и не зависит от самой себя */
function validateMain(app, video) {
  const id = video.getString('main_publication');

  if (!id) {
    return;
  }

  const post = app.findRecordById('video_posts', id);

  if (
    post.getString('video') !== video.id ||
    post.getString('anchor') !== 'date'
  ) {
    throw new BadRequestError(
      'Выберите публикацию этого видео со своей датой.'
    );
  }
}

/** Перенос/снятие опоры пересчитывает сроки в той же транзакции */
function refresh(app, videoId) {
  const posts = app.findRecordsByFilter(
    'video_posts',
    'video = {:video} && anchor = "main"',
    '',
    0,
    0,
    { video: videoId }
  );
  for (const post of posts) {
    const date = getSchedule(app, post);

    if (date !== post.getString('scheduled_at')) {
      post.set('scheduled_at', date);
      app.save(post);
    }
  }
}

/** Использованный аккаунт не удаляется и не превращается в другой сервис */
function protectAccounts(event) {
  const links = JSON.parse(event.record.getString('links') || '[]') || [];
  const previous =
    JSON.parse(event.record.original().getString('links') || '[]') || [];
  for (const old of previous) {
    const current = links.find((link) => link.id === old.id);

    if (
      current &&
      current.service === old.service &&
      current.directions.includes('video')
    ) {
      continue;
    }

    for (const collection of ['video_posts', 'promo_templates']) {
      const filter =
        collection === 'promo_templates'
          ? 'project = {:project} && account = {:account} && direction = "video"'
          : 'project = {:project} && account = {:account}';

      if (
        event.app.findRecordsByFilter(collection, filter, '', 1, 0, {
          project: event.record.id,
          account: old.id,
        }).length
      ) {
        throw new BadRequestError(
          'Аккаунт используется в публикациях или промо видео. Сначала измените их привязку.'
        );
      }
    }
  }
}

module.exports = {
  validate,
  validateMain,
  refresh,
  protectAccounts,
};
