/// <reference path="../pb_data/types.d.ts" />

// Схема MVP: шаблон этапов, песни и их этапы, тексты (с историей версий), идеи, журнал
// находок, комментарии. Права у всех вошедших одинаковые; регистрация закрыта - пользователей
// заводят в админке PocketBase (/_/).

const AUTH = '@request.auth.id != ""';
// автор записи - всегда тот, кто её создаёт
const AUTH_AUTHOR = '@request.auth.id != "" && @request.body.author = @request.auth.id';

const STAGE_STATUSES = ['not_started', 'in_progress', 'review', 'done', 'skipped'];
const INSTRUMENTS = ['vocals', 'guitar', 'bass', 'drums', 'synths', 'mix', 'master'];
const CATEGORIES = ['preamp', 'processor', 'cabinet', 'mic', 'plugin', 'technique', 'other'];

function timestamps() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
}

function rules(createRule) {
  return {
    listRule: AUTH,
    viewRule: AUTH,
    createRule: createRule,
    updateRule: AUTH,
    deleteRule: AUTH,
  };
}

// Шаблон этапов из ТЗ. Подэтапы записи живых - по инструменту: поиск звука, дубли, выбор.
const LIVE_STEPS = ['поиск звука и подхода', 'запись дублей', 'выбор и редактирование дублей'];
const TEMPLATE = [
  { title: 'Набросок, текст, идея' },
  { title: 'ИИ-эскиз аранжировки' },
  { title: 'Демо-аранжировка' },
  { title: 'Проект в Cubase, перенос стемов' },
  { title: 'Партия барабанов' },
  {
    title: 'Запись живых инструментов',
    substeps: ['Бас', 'Гитары', 'Вокал'].flatMap((i) => LIVE_STEPS.map((s) => `${i}: ${s}`)),
  },
  { title: 'Синтезаторы и виртуальные инструменты' },
  { title: 'Сведение' },
  { title: 'Эффекты', optional: true },
  { title: 'Общий мастер' },
];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    // список и карточки участников видны всем вошедшим (имя автора у комментариев и находок);
    // менять можно только себя; регистрации нет
    users.listRule = AUTH;
    users.viewRule = AUTH;
    users.createRule = null;
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = null;
    app.save(users);

    const templates = new Collection({
      type: 'base',
      name: 'stage_templates',
      ...rules(AUTH),
      fields: [
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'position', type: 'number', onlyInt: true, min: 0 },
        { name: 'optional', type: 'bool' },
        // подэтапы: массив строк
        { name: 'substeps', type: 'json', maxSize: 20000 },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_stage_templates_position ON stage_templates (position)'],
    });
    app.save(templates);

    const songs = new Collection({
      type: 'base',
      name: 'songs',
      ...rules(AUTH),
      fields: [
        { name: 'title', type: 'text', required: true, max: 200 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['active', 'paused', 'done', 'released'],
        },
        { name: 'bpm', type: 'number', onlyInt: true, min: 20, max: 400 },
        { name: 'key', type: 'text', max: 20 },
        { name: 'target_release', type: 'date' },
        { name: 'note', type: 'text', max: 10000 },
        ...timestamps(),
      ],
    });
    app.save(songs);

    const stages = new Collection({
      type: 'base',
      name: 'song_stages',
      ...rules(AUTH),
      fields: [
        {
          name: 'song',
          type: 'relation',
          required: true,
          collectionId: songs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'position', type: 'number', onlyInt: true, min: 0 },
        { name: 'optional', type: 'bool' },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: STAGE_STATUSES },
        { name: 'deadline', type: 'date' },
        { name: 'note', type: 'text', max: 20000 },
        // подэтапы: массив { title, done }
        { name: 'substeps', type: 'json', maxSize: 20000 },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_song_stages_song ON song_stages (song, position)'],
    });
    app.save(stages);

    const lyrics = new Collection({
      type: 'base',
      name: 'lyrics',
      // версии текста только добавляются: текущий текст - последняя версия песни
      listRule: AUTH,
      viewRule: AUTH,
      createRule: AUTH_AUTHOR,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'song',
          type: 'relation',
          required: true,
          collectionId: songs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'text', type: 'text', max: 50000 },
        {
          name: 'author',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_lyrics_song ON lyrics (song, created)'],
    });
    app.save(lyrics);

    const ideas = new Collection({
      type: 'base',
      name: 'ideas',
      ...rules(AUTH_AUTHOR),
      fields: [
        { name: 'text', type: 'text', required: true, max: 10000 },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['song', 'video'] },
        // теги: массив строк
        { name: 'tags', type: 'json', maxSize: 5000 },
        {
          name: 'author',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        // песня, в которую превратилась идея
        { name: 'song', type: 'relation', collectionId: songs.id, maxSelect: 1 },
        ...timestamps(),
      ],
    });
    app.save(ideas);

    const findings = new Collection({
      type: 'base',
      name: 'findings',
      ...rules(AUTH_AUTHOR),
      fields: [
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 20000 },
        // значения настроек текстом: "Gain 3, Bass 6, Presence 7"
        { name: 'settings', type: 'text', max: 20000 },
        { name: 'instrument', type: 'select', maxSelect: 1, values: INSTRUMENTS },
        { name: 'category', type: 'select', maxSelect: 1, values: CATEGORIES },
        { name: 'tags', type: 'json', maxSize: 5000 },
        // "в библиотеку": пресет, который стоит применять в других песнях
        { name: 'library', type: 'bool' },
        { name: 'song', type: 'relation', collectionId: songs.id, maxSelect: 1 },
        { name: 'stage', type: 'relation', collectionId: stages.id, maxSelect: 1 },
        {
          name: 'author',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        ...timestamps(),
      ],
    });
    app.save(findings);

    const comments = new Collection({
      type: 'base',
      name: 'comments',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: AUTH_AUTHOR,
      // свой комментарий правит и удаляет только автор
      updateRule: 'author = @request.auth.id && @request.body.author:isset = false',
      deleteRule: 'author = @request.auth.id',
      fields: [
        { name: 'text', type: 'text', required: true, max: 10000 },
        {
          name: 'song',
          type: 'relation',
          required: true,
          collectionId: songs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'stage',
          type: 'relation',
          collectionId: stages.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'author',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_comments_song ON comments (song, created)'],
    });
    app.save(comments);

    TEMPLATE.forEach((t, i) => {
      const r = new Record(templates);
      r.set('title', t.title);
      r.set('position', i);
      r.set('optional', t.optional === true);
      r.set('substeps', t.substeps ?? []);
      app.save(r);
    });
  },
  (app) => {
    for (const name of [
      'comments',
      'findings',
      'ideas',
      'lyrics',
      'song_stages',
      'songs',
      'stage_templates',
    ]) {
      app.delete(app.findCollectionByNameOrId(name));
    }
    const users = app.findCollectionByNameOrId('users');
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = 'id = @request.auth.id';
    app.save(users);
  },
);
