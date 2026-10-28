/// <reference path="../pb_data/types.d.ts" />

// Telegram больше не площадка публикаций: убирается из публикаций и промо-плана проектов.

function strip(app, collection) {
  for (const r of app.findAllRecords(collection)) {
    // поле json отдаётся сырыми байтами - читаем как строку
    let arr = [];
    try {
      arr = JSON.parse(r.getString('platforms') || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(arr) || !arr.includes('telegram')) continue;
    r.set(
      'platforms',
      arr.filter((p) => p !== 'telegram'),
    );
    app.saveNoValidate(r);
  }
}

migrate(
  (app) => {
    strip(app, 'posts');
    strip(app, 'promo_templates');
  },
  () => {},
);
