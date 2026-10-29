/// <reference path="../pb_data/types.d.ts" />

// Промо-план проекта - набор публикаций, которые кнопка "Добавить промо-план" создаёт у песни:
// название, площадки и день относительно релиза (offset: -14 - за две недели, 0 - в день
// релиза). Меняют его, как и этапы новых песен, редакторы и владелец. Проектам, созданным
// раньше, записывается прежний набор.

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED = '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Любая роль в проекте */
const ANY_ROLE =
  '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id || project.contributors.id ?= @request.auth.id || project.viewers.id ?= @request.auth.id)';

/** Владелец или редактор проекта */
const EDITOR = '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id)';

/** Прежний набор публикаций промо-плана: записывается проектам, созданным раньше */
const DEFAULT_PROMO = [
  { title: 'Анонс релиза', offset: -14, platforms: ['instagram', 'vk', 'telegram'] },
  { title: 'Тизер', offset: -7, platforms: ['instagram', 'tiktok', 'youtube'] },
  { title: 'Завтра релиз', offset: -1, platforms: ['instagram', 'telegram'] },
  { title: 'Релиз: ссылка на bandlink', offset: 0, platforms: ['instagram', 'vk', 'telegram'] },
  { title: 'История создания', offset: 3, platforms: ['instagram', 'tiktok'] },
  { title: 'Лайв или клип', offset: 7, platforms: ['youtube', 'vk'] },
];

migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    const promoTemplates = new Collection({
      type: 'base',
      name: 'promo_templates',
      listRule: `${TOTP_CONFIRMED} && ${ANY_ROLE}`,
      viewRule: `${TOTP_CONFIRMED} && ${ANY_ROLE}`,
      createRule: `${TOTP_CONFIRMED} && ${EDITOR}`,
      updateRule: `${TOTP_CONFIRMED} && ${EDITOR} && @request.body.project:isset = false`,
      deleteRule: `${TOTP_CONFIRMED} && ${EDITOR}`,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'offset', type: 'number', onlyInt: true, min: -365, max: 365 },
        { name: 'platforms', type: 'json', maxSize: 2000 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_promo_templates_project ON promo_templates (project, offset)'],
    });
    app.save(promoTemplates);
    for (const project of app.findAllRecords('projects')) {
      for (const step of DEFAULT_PROMO) {
        const record = new Record(promoTemplates);
        record.set('project', project.id);
        record.set('title', step.title);
        record.set('offset', step.offset);
        record.set('platforms', step.platforms);
        app.save(record);
      }
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('promo_templates'));
  },
);
