/// <reference path="../pb_data/types.d.ts" />

// Направление шаблона задаётся при создании: смена музыки на видео обходила выключенный выпуск.
const LOCK = ' && @request.body.direction:changed = false';
const COLLECTIONS = ['stage_templates', 'promo_templates'];

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);

      // null - правка только у суперпользователя, правило не трогаем
      if (collection.updateRule === null) {
        continue;
      }

      collection.updateRule = `(${collection.updateRule})${LOCK}`;
      app.save(collection);
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      const rule = collection.updateRule;

      if (rule === null || !rule.endsWith(LOCK)) {
        continue;
      }

      // Снимаем скобки, добавленные в up
      collection.updateRule = rule.slice(1, -LOCK.length - 1);
      app.save(collection);
    }
  }
);
