/// <reference path="../pb_data/types.d.ts" />

// Промо-план проекта - набор публикаций, которые кнопка "Добавить промо-план" создаёт у песни:
// название, площадки и день относительно релиза (offset: -14 - за две недели, 0 - в день
// релиза). Меняют его, как и этапы новых песен, редакторы и владелец. Проектам, созданным
// раньше, записывается прежний набор.

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
const ANY_ROLE =
  '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id || project.contributors.id ?= @request.auth.id || project.viewers.id ?= @request.auth.id)';
const EDITOR = '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id)';

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
    const col = new Collection({
      type: 'base',
      name: 'promo_templates',
      listRule: `${TOTP_OK} && ${ANY_ROLE}`,
      viewRule: `${TOTP_OK} && ${ANY_ROLE}`,
      createRule: `${TOTP_OK} && ${EDITOR}`,
      updateRule: `${TOTP_OK} && ${EDITOR} && @request.body.project:isset = false`,
      deleteRule: `${TOTP_OK} && ${EDITOR}`,
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
    app.save(col);
    for (const p of app.findAllRecords('projects')) {
      for (const t of DEFAULT_PROMO) {
        const r = new Record(col);
        r.set('project', p.id);
        r.set('title', t.title);
        r.set('offset', t.offset);
        r.set('platforms', t.platforms);
        app.save(r);
      }
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('promo_templates'));
  },
);
