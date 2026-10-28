// Задачи планировщика (pb_hooks/planner.pb.js).

// Когда задачу отметили выполненной - время отметки, сняли отметку - пусто. По нему
// показываются недавно выполненные.
function stampDone(task) {
  if (task.getBool('done')) {
    if (!task.getString('done_at')) task.set('done_at', new Date().toISOString());
  } else {
    task.set('done_at', '');
  }
}

// песня задачи - только из того же проекта
function checkSong(app, task) {
  const id = task.getString('song');
  if (!id) return;
  let song = null;
  try {
    song = app.findRecordById('songs', id);
  } catch (_e) {
    song = null;
  }
  if (!song || song.getString('project') !== task.getString('project')) {
    throw new BadRequestError('Песня из другого проекта.', {
      song: new ValidationError('wrong_project', 'Песня из другого проекта.'),
    });
  }
}

module.exports = { stampDone, checkSong };
