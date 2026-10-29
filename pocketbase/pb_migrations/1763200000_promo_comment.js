/// <reference path="../pb_data/types.d.ts" />

// Комментарий у публикации промо-плана: заметки о ней. Он становится текстом публикации, когда
// промо-план добавляют песне. "Ссылка на bandlink" из названия публикации в день релиза
// переезжает в комментарий.

migrate(
  (app) => {
    const promoTemplates = app.findCollectionByNameOrId('promo_templates');
    if (!promoTemplates.fields.getByName('comment')) {
      promoTemplates.fields.add(new Field({ name: 'comment', type: 'text', max: 2000 }));
      app.save(promoTemplates);
    }
    for (const record of app.findRecordsByFilter(
      'promo_templates',
      'title = "Релиз: ссылка на bandlink"',
      '',
      0,
      0,
    )) {
      record.set('title', 'Релиз');
      if (!record.getString('comment')) {
        record.set('comment', 'Ссылка на bandlink');
      }
      app.save(record);
    }
  },
  (app) => {
    const promoTemplates = app.findCollectionByNameOrId('promo_templates');
    promoTemplates.fields.removeByName('comment');
    app.save(promoTemplates);
  },
);
