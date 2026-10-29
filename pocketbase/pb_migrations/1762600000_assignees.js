/// <reference path="../pb_data/types.d.ts" />

// Несколько исполнителей у этапа и у задачи плана: assignee (один) -> assignees (список).
// Песню задачи проверяет хук (pb_hooks/planner.pb.js): правило обновления видит старое
// значение поля, а не присланное.

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED =
  '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Коллекции, у записей которых есть исполнители */
const ASSIGNABLE_COLLECTIONS = ['song_stages', 'tasks'];

/** Владелец, редактор или участник проекта: все, кроме наблюдателей */
function getWorkerCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id)`;
}

/** Задачи ведут все, кроме наблюдателей, с подключённой 2FA */
const TASK_WORK_RULE = `${TOTP_CONFIRMED} && ${getWorkerCondition('project.')}`;

/** Проект и автор задачи после создания не меняются */
const TASK_LOCKED_FIELDS =
  '@request.body.project:isset = false && @request.body.author:isset = false';

/** Исполнитель записи из assignee переносится в список assignees, поле assignee удаляется */
function convertToMany(app, name) {
  const users = app.findCollectionByNameOrId('users');
  const collection = app.findCollectionByNameOrId(name);

  if (!collection.fields.getByName('assignees')) {
    collection.fields.add(
      new Field({
        name: 'assignees',
        type: 'relation',
        collectionId: users.id,
        maxSelect: 20,
      })
    );
    app.save(collection);
  }

  if (collection.fields.getByName('assignee')) {
    for (const record of app.findRecordsByFilter(
      name,
      'assignee != ""',
      '',
      0,
      0
    )) {
      record.set('assignees', [record.getString('assignee')]);
      app.saveNoValidate(record);
    }
    collection.fields.removeByName('assignee');
    app.save(collection);
  }
}

migrate(
  (app) => {
    for (const name of ASSIGNABLE_COLLECTIONS) {
      convertToMany(app, name);
    }
    const tasks = app.findCollectionByNameOrId('tasks');
    tasks.createRule = `${TASK_WORK_RULE} && @request.body.author = @request.auth.id`;
    tasks.updateRule = `${TASK_WORK_RULE} && ${TASK_LOCKED_FIELDS}`;
    app.save(tasks);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    for (const name of ASSIGNABLE_COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);

      if (!collection.fields.getByName('assignee')) {
        collection.fields.add(
          new Field({
            name: 'assignee',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
          })
        );
        app.save(collection);
      }

      // в прежней схеме исполнитель один: остаётся первый из списка
      for (const record of app.findAllRecords(name)) {
        const assignees = record.getStringSlice('assignees');

        if (assignees.length === 0) {
          continue;
        }

        record.set('assignee', assignees[0]);
        app.saveNoValidate(record);
      }
      collection.fields.removeByName('assignees');
      app.save(collection);
    }
    // правила задач - как в 1762500000_planner.js: песню из того же проекта проверяло правило
    const tasks = app.findCollectionByNameOrId('tasks');
    const songInProject =
      '(@request.body.song:isset = false || @request.body.song = "" || song.project = project)';
    tasks.createRule = `${TASK_WORK_RULE} && @request.body.author = @request.auth.id && ${songInProject}`;
    tasks.updateRule = `${TASK_WORK_RULE} && ${TASK_LOCKED_FIELDS} && ${songInProject}`;
    app.save(tasks);
  }
);
