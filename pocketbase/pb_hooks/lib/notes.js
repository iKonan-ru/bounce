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

module.exports = { validateBecameSong };
