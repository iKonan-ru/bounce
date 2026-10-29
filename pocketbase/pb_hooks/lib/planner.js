// Задачи, публикации и исполнители этапов (pb_hooks/planner.pb.js).

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

// Go-срез из записи - в обычный массив
function list(slice) {
  const out = [];
  for (const v of slice) out.push(v);
  return out;
}

// Исполнители этапа, задачи или публикации - только те, кто работает в проекте: владелец,
// редакторы и участники (наблюдатель только смотрит). Проверяются лишь добавленные по сравнению
// с прежним значением записи: исполнитель, которого потом перевели в наблюдатели или убрали из
// проекта, остаётся назначенным, пока его не снимут, и не мешает править запись.
function checkAssignees(app, record, projectId) {
  const before = list(record.original().getStringSlice('assignees'));
  const added = list(record.getStringSlice('assignees')).filter((id) => !before.includes(id));
  if (added.length === 0) return;
  let project = null;
  try {
    project = app.findRecordById('projects', projectId);
  } catch (_e) {
    project = null;
  }
  const workers = project
    ? [
        project.getString('owner'),
        ...list(project.getStringSlice('editors')),
        ...list(project.getStringSlice('contributors')),
      ]
    : [];
  if (added.some((id) => !workers.includes(id))) {
    throw new BadRequestError(
      'Исполнителем можно назначить только владельца, редактора или участника проекта.',
      { assignees: new ValidationError('not_worker', 'Этот человек не работает в проекте.') },
    );
  }
}

// проект этапа - через его песню
function stageProject(app, stage) {
  try {
    return app.findRecordById('songs', stage.getString('song')).getString('project');
  } catch (_e) {
    return '';
  }
}

module.exports = { stampDone, checkSong, checkAssignees, stageProject };
