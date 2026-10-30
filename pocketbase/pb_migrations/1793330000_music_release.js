/// <reference path="../pb_data/types.d.ts" />

// Старые проекты сохраняют выпуск, новые клиенты выбирают его явно.
migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.add(
      new Field({ name: 'music_release_enabled', type: 'bool' })
    );
    app.save(projects);
    app
      .db()
      .newQuery('UPDATE projects SET music_release_enabled = true')
      .execute();
  },
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.removeByName('music_release_enabled');
    app.save(projects);
  }
);
