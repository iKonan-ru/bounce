/// <reference path="../pb_data/types.d.ts" />

/** Личная задача доступна только автору с действующей учетной записью */
const PERSONAL =
  '@request.auth.id != "" && @request.auth.totp_enabled = true && @request.auth.disabled = false && project = "" && author = @request.auth.id';

migrate(
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks');
    tasks.fields.getByName('project').required = false;
    for (const action of ['list', 'view', 'create', 'update', 'delete']) {
      const key = `${action}Rule`;
      let extra = '';

      if (action === 'create') {
        extra = ' && song = ""';
      }

      if (action === 'update') {
        extra =
          ' && @request.body.project:changed = false && @request.body.author:changed = false';
      }

      tasks[key] = `(${tasks[key]}) || (${PERSONAL}${extra})`;
    }
    app.save(tasks);
  },
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks');
    // Сами личные задачи сохраняются при откате и снова доступны после повторной миграции.
    for (const action of ['list', 'view', 'create', 'update', 'delete']) {
      const key = `${action}Rule`;
      tasks[key] = tasks[key].slice(1, tasks[key].indexOf(`) || (${PERSONAL}`));
    }
    app.save(tasks);
  }
);
