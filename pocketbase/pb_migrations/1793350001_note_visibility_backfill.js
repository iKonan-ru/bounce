/// <reference path="../pb_data/types.d.ts" />

// Исправление переноса старых записей: двойные кавычки SQL прочитал как имя столбца project.
// Настроенную пользователем корректную видимость не трогаем.
migrate((app) => {
  app
    .db()
    .newQuery(
      'UPDATE notes SET visibility = {:shared} WHERE visibility NOT IN ({:shared}, {:personal}, {:selected})'
    )
    .bind({ shared: 'project', personal: 'private', selected: 'selected' })
    .execute();
});
