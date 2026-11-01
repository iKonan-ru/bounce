/** Контекст заметки: раздел или его этап в том же проекте */
function validateNote(event) {
  const note = event.record;
  const isOther = note.getBool('other');
  const stageId = note.getString('other_stage');

  if (note.isNew() && isOther && stageId && !note.getString('project_task')) {
    note.set(
      'project_task',
      event.app
        .findRecordById('other_stages', stageId)
        .getString('project_task')
    );
  }

  const taskId = note.getString('project_task');
  const moved =
    isOther !== note.original().getBool('other') ||
    stageId !== note.original().getString('other_stage') ||
    taskId !== note.original().getString('project_task');

  if (!note.isNew() && moved && (isOther || stageId)) {
    throw new BadRequestError(
      'Заметку можно перенести только на уровень проекта.'
    );
  }

  if (!isOther && !stageId) {
    if (taskId && note.isNew()) {
      throw new BadRequestError('Выберите один контекст заметки.');
    }

    note.set('project_task', '');

    return;
  }

  if (
    !isOther ||
    ['song', 'stage', 'video', 'video_stage', 'became_song'].some((field) =>
      note.getString(field)
    )
  ) {
    throw new BadRequestError('Выберите один контекст заметки.');
  }

  require(`${__hooks}/lib/project-directions.js`).validateContent(
    event,
    'other'
  );

  if (
    taskId &&
    event.app.findRecordById('project_tasks', taskId).getString('project') !==
      note.getString('project')
  ) {
    throw new BadRequestError('Задача должна относиться к этому проекту.');
  }

  if (
    stageId &&
    event.app
      .findRecordById('other_stages', stageId)
      .getString('project_task') !== taskId
  ) {
    throw new BadRequestError('Этап должен относиться к выбранной задаче.');
  }

  if (
    stageId &&
    event.app.findRecordById('other_stages', stageId).getString('project') !==
      note.getString('project')
  ) {
    throw new BadRequestError('Этап должен относиться к этому проекту.');
  }

  if (
    ['images', 'audio'].some(
      (field) =>
        note.getStringSlice(field).length || note.getUploadedFiles(field).length
    )
  ) {
    throw new BadRequestError(
      'В разделе "Задачи" доступны только текстовые заметки.'
    );
  }
}
module.exports = { validateNote };
