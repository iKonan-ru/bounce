/// <reference path="../pb_data/types.d.ts" />

// Время у сроков плана убрано: системный выбор времени по-разному и неудобно работает на
// разных устройствах. Поле удаляется из задач, этапов и публикаций вместе с данными.

/** Время "чч:мм" - как было до удаления поля */
const TIME_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$';

/** Коллекции, из которых удаляется время */
const TIMED_COLLECTIONS = ['tasks', 'song_stages', 'posts'];

migrate(
  (app) => {
    for (const name of TIMED_COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      if (collection.fields.getByName('time')) {
        collection.fields.removeByName('time');
        app.save(collection);
      }
    }
  },
  (app) => {
    for (const name of TIMED_COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      if (!collection.fields.getByName('time')) {
        collection.fields.add(new Field({ name: 'time', type: 'text', pattern: TIME_PATTERN }));
        app.save(collection);
      }
    }
  },
);
