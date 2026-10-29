/// <reference path="../pb_data/types.d.ts" />

// Время у сроков плана убрано: системный выбор времени по-разному и неудобно работает на
// разных устройствах. Поле удаляется из задач, этапов и публикаций вместе с данными.

const TIME = '^([01][0-9]|2[0-3]):[0-5][0-9]$';
const COLLECTIONS = ['tasks', 'song_stages', 'posts'];

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const col = app.findCollectionByNameOrId(name);
      if (col.fields.getByName('time')) {
        col.fields.removeByName('time');
        app.save(col);
      }
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const col = app.findCollectionByNameOrId(name);
      if (!col.fields.getByName('time')) {
        col.fields.add(new Field({ name: 'time', type: 'text', pattern: TIME }));
        app.save(col);
      }
    }
  },
);
