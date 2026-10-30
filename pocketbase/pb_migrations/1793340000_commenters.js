/// <reference path="../pb_data/types.d.ts" />

/** Коллекции, содержимое которых видят все участники проекта */
const PROJECT_COLLECTIONS = [
  'projects',
  'songs',
  'song_stages',
  'stage_templates',
  'notes',
  'tasks',
  'posts',
  'promo_templates',
];

/** Чтение новой роли; остальные ограничения действующих правил сохраняются */
function updateViewRules(app, isAdding) {
  for (const name of PROJECT_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name);
    for (const key of ['listRule', 'viewRule']) {
      const rule = collection[key];
      collection[key] = isAdding
        ? rule.replace(
            /([\w.]*?)viewers.id \?= @request.auth.id/g,
            '$& || $1commenters.id ?= @request.auth.id'
          )
        : rule.replace(/ \|\| [\w.]*commenters.id \?= @request.auth.id/g, '');
    }
    app.save(collection);
  }
}

/** Создание и изменение своих заметок; файлы дополнительно защищает хук */
function updateNoteRules(app, isAdding) {
  const notes = app.findCollectionByNameOrId('notes');
  const worker = 'project.contributors.id ?= @request.auth.id';
  const writer = `${worker} || project.commenters.id ?= @request.auth.id`;
  for (const key of ['createRule', 'updateRule', 'deleteRule']) {
    notes[key] = isAdding
      ? notes[key].replace(worker, writer)
      : notes[key].replace(writer, worker);
  }
  app.save(notes);
}

migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.add(
      new Field({
        name: 'commenters',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('users').id,
        maxSelect: 50,
      })
    );
    app.save(projects);
    updateViewRules(app, true);
    updateNoteRules(app, true);
  },
  (app) => {
    updateViewRules(app, false);
    updateNoteRules(app, false);
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.removeByName('commenters');
    app.save(projects);
  }
);
