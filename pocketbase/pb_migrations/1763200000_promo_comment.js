/// <reference path="../pb_data/types.d.ts" />

// Комментарий у публикации промо-плана: заметки о ней. Он становится текстом публикации, когда
// промо-план добавляют песне. "Ссылка на bandlink" из названия публикации в день релиза
// переезжает в комментарий.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('promo_templates');
    if (!col.fields.getByName('comment')) {
      col.fields.add(new Field({ name: 'comment', type: 'text', max: 2000 }));
      app.save(col);
    }
    for (const r of app.findRecordsByFilter(
      'promo_templates',
      'title = "Релиз: ссылка на bandlink"',
      '',
      0,
      0,
    )) {
      r.set('title', 'Релиз');
      if (!r.getString('comment')) r.set('comment', 'Ссылка на bandlink');
      app.save(r);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('promo_templates');
    col.fields.removeByName('comment');
    app.save(col);
  },
);
