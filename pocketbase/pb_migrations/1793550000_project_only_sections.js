/// <reference path="../pb_data/types.d.ts" />

/** Личные разделы закрыты; существующие записи сохраняются без переноса в проекты */
const PROJECT_ONLY = 'project != "" && (';

migrate(
  (app) => {
    for (const name of ['notes', 'tasks']) {
      const collection = app.findCollectionByNameOrId(name);
      for (const action of ['list', 'view', 'create', 'update', 'delete']) {
        const key = `${action}Rule`;
        collection[key] = `${PROJECT_ONLY}${collection[key]})`;
      }
      app.save(collection);
    }
  },
  (app) => {
    for (const name of ['notes', 'tasks']) {
      const collection = app.findCollectionByNameOrId(name);
      for (const action of ['list', 'view', 'create', 'update', 'delete']) {
        const key = `${action}Rule`;
        collection[key] = collection[key].slice(PROJECT_ONLY.length, -1);
      }
      app.save(collection);
    }
  }
);
