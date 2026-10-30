/** Список всех пользователей проекта, включая владельца */
function getMembers(project) {
  const members = [project.getString('owner')];
  for (const field of ['editors', 'contributors', 'commenters', 'viewers']) {
    for (const id of project.getStringSlice(field)) {
      members.push(id);
    }
  }

  return members;
}

/** Видимость задает автор; выбранные получатели только из своего проекта */
function validateVisibility(event) {
  const note = event.record;

  if (note.isNew() && !note.getString('visibility')) {
    note.set('visibility', 'project');
  }

  const before = note.original();
  const changed = ['visibility', 'recipients'].some(
    (field) =>
      JSON.stringify(note.get(field)) !== JSON.stringify(before.get(field))
  );

  if (!changed) {
    return;
  }

  if (
    !event.hasSuperuserAuth() &&
    note.getString('author') !== event.auth?.id
  ) {
    throw new ForbiddenError('Видимость меняет только автор заметки.');
  }

  const recipients = Array.from(note.getStringSlice('recipients'));

  if (note.getString('visibility') !== 'selected') {
    note.set('recipients', []);

    return;
  }

  const project = event.app.findRecordById(
    'projects',
    note.getString('project')
  );
  const members = getMembers(project);
  const hasOutsider = recipients.some(
    (id) => !members.includes(id) || id === note.getString('author')
  );

  if (recipients.length === 0 || hasOutsider) {
    throw new BadRequestError(
      'Выберите участников этого проекта. Автор видит заметку всегда.'
    );
  }
}

/** Перенос заметки остается внутри ее проекта */
function validateContext(event) {
  const note = event.record;
  const songId = note.getString('song');
  const stageId = note.getString('stage');
  const isMoved = ['song', 'stage'].some(
    (field) => note.getString(field) !== note.original().getString(field)
  );

  if (!note.isNew() && isMoved && (songId || stageId)) {
    throw new BadRequestError(
      'Заметку можно перенести только на уровень проекта.'
    );
  }

  if (songId) {
    const song = event.app.findRecordById('songs', songId);

    if (song.getString('project') !== note.getString('project')) {
      throw new BadRequestError('Песня должна быть из этого проекта.');
    }
  }

  if (stageId) {
    const stage = event.app.findRecordById('song_stages', stageId);

    if (!songId || stage.getString('song') !== songId) {
      throw new BadRequestError('Этап должен относиться к выбранной песне.');
    }
  }
}

/** Сигнал без содержимого: приходит и тем, кому новый доступ уже закрыт */
function notifyAccess(app, memberIds) {
  for (const client of Object.values(app.subscriptionsBroker().clients())) {
    const auth = client.get('auth');

    if (
      auth &&
      memberIds.includes(auth.id) &&
      client.hasSubscription('notes-access')
    ) {
      client.send(
        new SubscriptionMessage({ name: 'notes-access', data: '{}' })
      );
    }
  }
}

/** Нельзя удалить чужую закрытую заметку вместе с песней или этапом */
function protectNestedNotes(event, field) {
  if (event.hasSuperuserAuth()) {
    return;
  }

  const notes = event.app.findRecordsByFilter(
    'notes',
    `${field} = {:id} && visibility != "project" && author != {:author}`,
    '',
    1,
    0,
    { id: event.record.id, author: event.auth?.id ?? '' }
  );

  if (notes.length > 0) {
    throw new BadRequestError(
      'Внутри есть личные заметки других участников. Их авторы могут перенести заметки в проект.'
    );
  }
}

module.exports = {
  getMembers,
  validateVisibility,
  validateContext,
  notifyAccess,
  protectNestedNotes,
};
