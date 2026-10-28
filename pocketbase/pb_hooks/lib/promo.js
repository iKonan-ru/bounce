// Промо-план нового проекта: публикации вокруг релиза (offset - дней до или после него). Его
// правят в настройках проекта; то же записывает миграция 1763000000_promo_templates.js для
// проектов, созданных раньше.
const DEFAULT_PROMO = [
  { title: 'Анонс релиза', offset: -14, platforms: ['instagram', 'vk', 'telegram'] },
  { title: 'Тизер', offset: -7, platforms: ['instagram', 'tiktok', 'youtube'] },
  { title: 'Завтра релиз', offset: -1, platforms: ['instagram', 'telegram'] },
  { title: 'Релиз: ссылка на bandlink', offset: 0, platforms: ['instagram', 'vk', 'telegram'] },
  { title: 'История создания', offset: 3, platforms: ['instagram', 'tiktok'] },
  { title: 'Лайв или клип', offset: 7, platforms: ['youtube', 'vk'] },
];

function seedPromo(app, projectId) {
  const col = app.findCollectionByNameOrId('promo_templates');
  for (const p of DEFAULT_PROMO) {
    const r = new Record(col);
    r.set('project', projectId);
    r.set('title', p.title);
    r.set('offset', p.offset);
    r.set('platforms', p.platforms);
    app.save(r);
  }
}

module.exports = { DEFAULT_PROMO, seedPromo };
