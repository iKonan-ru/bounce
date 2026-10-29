/// <reference path="../pb_data/types.d.ts" />

// Telegram больше не площадка публикаций: убирается из публикаций и промо-плана проектов.

/** Площадка, которая убирается */
const REMOVED_PLATFORM = 'telegram';

/** Убрать Telegram из площадок всех записей коллекции collectionName */
function removeTelegram(app, collectionName) {
  for (const record of app.findAllRecords(collectionName)) {
    // поле json отдаётся сырыми байтами - читаем как строку
    let platforms = [];
    try {
      platforms = JSON.parse(record.getString('platforms') || '[]');
    } catch {
      continue;
    }
    const hasTelegram =
      Array.isArray(platforms) && platforms.includes(REMOVED_PLATFORM);

    if (!hasTelegram) {
      continue;
    }

    record.set(
      'platforms',
      platforms.filter((platform) => platform !== REMOVED_PLATFORM)
    );
    app.saveNoValidate(record);
  }
}

migrate(
  (app) => {
    removeTelegram(app, 'posts');
    removeTelegram(app, 'promo_templates');
  },
  () => {
    // убранный Telegram в публикации и промо-план не возвращается
  }
);
