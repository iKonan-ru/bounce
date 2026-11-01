/** Контекст заметки: раздел или его этап в том же проекте */
function validateNote(event) {
  const note = event.record;
  const isOther = note.getBool('other');
  const stageId = note.getString('other_stage');
  const moved =
    isOther !== note.original().getBool('other') ||
    stageId !== note.original().getString('other_stage');

  if (!note.isNew() && moved && (isOther || stageId)) {
    throw new BadRequestError(
      'Заметку можно перенести только на уровень проекта.'
    );
  }

  if (!isOther && !stageId) {
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
      'В разделе "Другое" доступны только текстовые заметки.'
    );
  }
}
module.exports = { validateNote };
