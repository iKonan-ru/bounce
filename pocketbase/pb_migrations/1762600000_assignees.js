/// <reference path="../pb_data/types.d.ts" />

// Несколько исполнителей у этапа и у задачи плана: assignee (один) -> assignees (список).
// Песню задачи проверяет хук (pb_hooks/planner.pb.js): правило обновления видит старое
// значение поля, а не присланное.

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
function worker(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id || ${p}contributors.id ?= @request.auth.id)`;
}

function toMany(app, name) {
  const users = app.findCollectionByNameOrId('users');
  const c = app.findCollectionByNameOrId(name);
  if (!c.fields.getByName('assignees')) {
    c.fields.add(
      new Field({ name: 'assignees', type: 'relation', collectionId: users.id, maxSelect: 20 }),
    );
    app.save(c);
  }
  if (c.fields.getByName('assignee')) {
    for (const r of app.findRecordsByFilter(name, 'assignee != ""', '', 0, 0)) {
      r.set('assignees', [r.getString('assignee')]);
      app.saveNoValidate(r);
    }
    c.fields.removeByName('assignee');
    app.save(c);
  }
}

migrate(
  (app) => {
    toMany(app, 'song_stages');
    toMany(app, 'tasks');
    const tasks = app.findCollectionByNameOrId('tasks');
    const work = `${TOTP_OK} && ${worker('project.')}`;
    tasks.createRule = `${work} && @request.body.author = @request.auth.id`;
    tasks.updateRule = `${work} && @request.body.project:isset = false && @request.body.author:isset = false`;
    app.save(tasks);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    for (const name of ['song_stages', 'tasks']) {
      const c = app.findCollectionByNameOrId(name);
      if (!c.fields.getByName('assignee')) {
        c.fields.add(
          new Field({ name: 'assignee', type: 'relation', collectionId: users.id, maxSelect: 1 }),
        );
        app.save(c);
      }
      // в прежней схеме исполнитель один: остаётся первый из списка
      for (const r of app.findAllRecords(name)) {
        const list = r.getStringSlice('assignees');
        if (list.length === 0) continue;
        r.set('assignee', list[0]);
        app.saveNoValidate(r);
      }
      c.fields.removeByName('assignees');
      app.save(c);
    }
    // правила задач - как в 1762500000_planner.js: песню из того же проекта проверяло правило
    const tasks = app.findCollectionByNameOrId('tasks');
    const work = `${TOTP_OK} && ${worker('project.')}`;
    const songInProject =
      '(@request.body.song:isset = false || @request.body.song = "" || song.project = project)';
    const locked = '@request.body.project:isset = false && @request.body.author:isset = false';
    tasks.createRule = `${work} && @request.body.author = @request.auth.id && ${songInProject}`;
    tasks.updateRule = `${work} && ${locked} && ${songInProject}`;
    app.save(tasks);
  },
);
