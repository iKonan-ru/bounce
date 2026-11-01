/** Карточка задачи использует те же состояния, что и видео. */
function validateTask(event) {
  if (!event.record.getString('status')) {
    event.record.set('status', 'not_started');
  }

  require(`${__hooks}/lib/project-directions.js`).validateContent(
    event,
    'other'
  );
}

/** Общие проверки этапов и неизменяемая связь с карточкой своего проекта. */
function validateStage(event) {
  const record = event.record;
  const task = event.app.findRecordById(
    'project_tasks',
    record.getString('project_task')
  );

  if (task.getString('project') !== record.getString('project')) {
    throw new BadRequestError('Задача должна относиться к этому проекту.');
  }

  require(`${__hooks}/lib/video.js`).validateStage(
    event,
    'project_tasks',
    'project_task'
  );
}

/** Начатый этап переводит новую задачу в работу, как у песни. */
function startTask(app, stage) {
  if (!['in_progress', 'done'].includes(stage.getString('status'))) {
    return;
  }

  const task = app.findRecordById(
    'project_tasks',
    stage.getString('project_task')
  );

  if (task.getString('status') === 'not_started') {
    task.set('status', 'active');
    app.save(task);
  }
}
module.exports = { validateTask, validateStage, startTask };
