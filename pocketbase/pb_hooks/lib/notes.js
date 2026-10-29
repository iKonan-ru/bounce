// Заметки (pb_hooks/notes.pb.js).

// "Стала песней" - только песня того же проекта, что и заметка. Правило PocketBase этого не
// проверяет: при обновлении оно видит прежнее значение поля, а не присланное. Прежнее значение
// не перепроверяется: песню могли удалить, и связь уже пуста.
function checkBecameSong(app, note) {
  const id = note.getString('became_song');
  if (!id || id === note.original().getString('became_song')) return;
  let song = null;
  try {
    song = app.findRecordById('songs', id);
  } catch (_e) {
    song = null;
  }
  if (!song || song.getString('project') !== note.getString('project')) {
    throw new BadRequestError('Песня из другого проекта.', {
      became_song: new ValidationError('wrong_project', 'Песня из другого проекта.'),
    });
  }
}

module.exports = { checkBecameSong };
