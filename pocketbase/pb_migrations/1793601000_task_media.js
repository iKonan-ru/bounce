/// <reference path="../pb_data/types.d.ts" />

// Контекст задач дополняется видео. Права задач сохраняются; контекст проверяет planner.pb.js.
migrate(
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks');
    tasks.fields.add(
      new Field({
        name: 'video',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('videos').id,
        maxSelect: 1,
        required: false,
        cascadeDelete: false,
      })
    );
    app.save(tasks);
  },
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks');
    tasks.fields.removeByName('video');
    app.save(tasks);
  }
);
