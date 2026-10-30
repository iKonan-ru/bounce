// Заметки (pb_hooks/notes.pb.js).

/** Текст отказа: песня из другого проекта */
const WRONG_PROJECT_MESSAGE = 'Песня из другого проекта.';

/** Песня по id; нет такой - null */
function findSong(app, songId) {
  try {
    return app.findRecordById('songs', songId);
  } catch (_error) {
    return null;
  }
}

/**
 * "Стала песней" - только песня того же проекта, что и заметка
 *
 * Правило PocketBase этого не проверяет: при обновлении оно видит прежнее значение поля, а не
 * присланное. Прежнее значение не перепроверяется: песню могли удалить, и связь уже пуста
 */
function validateBecameSong(app, note) {
  const songId = note.getString('became_song');
  const isUnchanged = songId === note.original().getString('became_song');

  if (!songId || isUnchanged) {
    return;
  }

  const song = findSong(app, songId);

  if (song && song.getString('project') === note.getString('project')) {
    return;
  }

  throw new BadRequestError(WRONG_PROJECT_MESSAGE, {
    became_song: new ValidationError('wrong_project', WRONG_PROJECT_MESSAGE),
  });
}

/** Ограниченный доступ разрешает только текст, даже при прямом запросе или старом клиенте */
function validateTextOnly(event) {
  if (!event.auth || event.hasSuperuserAuth()) {
    return;
  }

  const note = event.record;
  const project = event.app.findRecordById(
    'projects',
    note.getString('project')
  );
  let isCommenter = false;
  for (const userId of project.getStringSlice('commenters')) {
    isCommenter = isCommenter || userId === event.auth.id;
  }

  if (!isCommenter) {
    return;
  }

  const original = note.original();
  const hasUpload = ['images', 'audio'].some(
    (field) => note.getUploadedFiles(field).length > 0
  );
  const hasChangedFields = [
    'images',
    'audio',
    'audio_names',
    'became_song',
  ].some(
    (field) =>
      JSON.stringify(note.get(field)) !== JSON.stringify(original.get(field))
  );

  if (hasUpload || hasChangedFields) {
    throw new BadRequestError(
      'С этим доступом можно менять только текст заметки, без файлов.'
    );
  }

  const isTextChanged =
    note.isNew() || note.getString('text') !== original.getString('text');

  if (isTextChanged && !note.getString('text').trim()) {
    throw new BadRequestError('Напишите текст заметки.');
  }
}

module.exports = { validateBecameSong, validateTextOnly };
