/// <reference path="../pb_data/types.d.ts" />

// Планировщик проекта: у этапа песни появляется исполнитель, а у проекта - свои задачи
// (произвольные пункты со сроком, исполнителем и, по желанию, песней). Задачи ведут участники и
// редакторы, наблюдатели только смотрят. Отметку времени выполнения ставит хук
// (pb_hooks/planner.pb.js).

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED = '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Любая роль в проекте; prefix - путь от записи до проекта */
function getAnyRoleCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id || ${prefix}viewers.id ?= @request.auth.id)`;
}

/** Владелец, редактор или участник проекта: все, кроме наблюдателей */
function getWorkerCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id)`;
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const projects = app.findCollectionByNameOrId('projects');
    const songs = app.findCollectionByNameOrId('songs');

    const stages = app.findCollectionByNameOrId('song_stages');
    if (!stages.fields.getByName('assignee')) {
      stages.fields.add(
        new Field({ name: 'assignee', type: 'relation', collectionId: users.id, maxSelect: 1 }),
      );
    }
    app.save(stages);

    const viewRule = `${TOTP_CONFIRMED} && ${getAnyRoleCondition('project.')}`;
    const workRule = `${TOTP_CONFIRMED} && ${getWorkerCondition('project.')}`;
    const songInProject =
      '(@request.body.song:isset = false || @request.body.song = "" || song.project = project)';
    const tasks = new Collection({
      type: 'base',
      name: 'tasks',
      listRule: viewRule,
      viewRule: viewRule,
      createRule: `${workRule} && @request.body.author = @request.auth.id && ${songInProject}`,
      updateRule: `${workRule} && @request.body.project:isset = false && @request.body.author:isset = false && ${songInProject}`,
      deleteRule: workRule,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'done', type: 'bool' },
        { name: 'done_at', type: 'date' },
        { name: 'due', type: 'date' },
        { name: 'assignee', type: 'relation', collectionId: users.id, maxSelect: 1 },
        // песня, к которой относится задача; удалили песню - задача остаётся без неё
        { name: 'song', type: 'relation', collectionId: songs.id, maxSelect: 1 },
        {
          name: 'author',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tasks_project ON tasks (project, done, due)'],
    });
    app.save(tasks);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('tasks'));
    const stages = app.findCollectionByNameOrId('song_stages');
    stages.fields.removeByName('assignee');
    app.save(stages);
  },
);
