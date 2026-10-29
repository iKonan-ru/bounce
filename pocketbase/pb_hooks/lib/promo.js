/**
 * Промо-план нового проекта: публикации вокруг релиза
 *
 * Offset - дней до или после него, comment - заметки о публикации, становятся её текстом. Его
 * правят в настройках проекта; то же записывает миграция 1763000000_promo_templates.js для
 * проектов, созданных раньше
 */
const DEFAULT_PROMO = [
  { title: 'Анонс релиза', offset: -14, platforms: ['instagram', 'vk'] },
  { title: 'Тизер', offset: -7, platforms: ['instagram', 'tiktok', 'youtube'] },
  { title: 'Завтра релиз', offset: -1, platforms: ['instagram'] },
  {
    title: 'Релиз',
    offset: 0,
    platforms: ['instagram', 'vk'],
    comment: 'Ссылка на bandlink',
  },
  { title: 'История создания', offset: 3, platforms: ['instagram', 'tiktok'] },
  { title: 'Лайв или клип', offset: 7, platforms: ['youtube', 'vk'] },
];

/** Записать промо-план по умолчанию новому проекту */
function seedPromo(app, projectId) {
  const promoTemplates = app.findCollectionByNameOrId('promo_templates');
  for (const step of DEFAULT_PROMO) {
    const record = new Record(promoTemplates);
    record.set('project', projectId);
    record.set('title', step.title);
    record.set('offset', step.offset);
    record.set('platforms', step.platforms);
    record.set('comment', step.comment || '');
    app.save(record);
  }
}

module.exports = { DEFAULT_PROMO, seedPromo };
