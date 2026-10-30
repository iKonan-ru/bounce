/// <reference path="../pb_data/types.d.ts" />

// Существующие проекты сохраняют музыкальное наполнение. Видео включим после его реализации.
migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.add(
      new Field({
        name: 'directions',
        type: 'select',
        values: ['music', 'video'],
        maxSelect: 2,
        required: true,
      })
    );
    app.save(projects);
    app.db().newQuery(`UPDATE projects SET directions = '["music"]'`).execute();
  },
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.removeByName('directions');
    app.save(projects);
  }
);
