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
function getSchedule(post) {
  const day = post.getString('date').slice(0, 10);
  const timezone = post.getString('timezone');

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

  if (record.getString('anchor') !== 'date') {
    throw new BadRequestError('Укажите дату самой публикации.');
  }

  record.set('offset', 0);
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

  require(`${__hooks}/lib/planner.js`).validateAssignees(
    app,
    record,
    record.getString('project')
  );
  record.set('scheduled_at', getSchedule(record));
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

    if (
      event.app.findRecordsByFilter(
        'video_posts',
        'project = {:project} && account = {:account}',
        '',
        1,
        0,
        { project: event.record.id, account: old.id }
      ).length
    ) {
      throw new BadRequestError(
        'Аккаунт используется в публикациях видео. Сначала измените их привязку.'
      );
    }
  }
}

module.exports = {
  validate,
  protectAccounts,
};
