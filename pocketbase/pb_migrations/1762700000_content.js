/// <reference path="../pb_data/types.d.ts" />

// - Песня "не начата": новый статус по умолчанию; когда этап песни берут в работу, песня сама
//   становится "в работе" (pb_hooks/song-status.pb.js). Песни, у которых ни один этап ещё не
//   начат, переводятся в "не начата".
// - Ссылки проекта на страницы в сервисах (links: [{ service, url }]).
// - Исходные имена аудио в заметке (audio_names).
// - Время у сроков плана: "чч:мм", необязательно.
// - Контент-план: публикации проекта (posts) с площадками, статусом и датой - обычной или
//   от даты релиза песни (anchor = release, offset - дней до/после релиза).

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED =
  '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Любая роль в проекте; prefix - путь от записи до проекта */
function getAnyRoleCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id || ${prefix}viewers.id ?= @request.auth.id)`;
}

/** Владелец, редактор или участник проекта: все, кроме наблюдателей */
function getWorkerCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id)`;
}

/** Время "чч:мм" */
const TIME_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$';

/** Коллекции, у сроков которых появляется время */
const TIMED_COLLECTIONS = ['tasks', 'song_stages'];

/** Статус песни: не начата */
const NOT_STARTED_STATUS = 'not_started';

/** Статус песни: в работе */
const ACTIVE_STATUS = 'active';

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    const projects = app.findCollectionByNameOrId('projects');
    const songs = app.findCollectionByNameOrId('songs');

    songs.fields.getByName('status').values = [
      'not_started',
      'active',
      'paused',
      'done',
      'sent',
      'released',
    ];
    app.save(songs);
    for (const song of app.findRecordsByFilter(
      'songs',
      `status = "${ACTIVE_STATUS}"`,
      '',
      0,
      0
    )) {
      const startedStages = app.findRecordsByFilter(
        'song_stages',
        'song = {:songId} && (status = "in_progress" || status = "done")',
        '',
        1,
        0,
        { songId: song.id }
      );

      if (startedStages.length === 0) {
        song.set('status', NOT_STARTED_STATUS);
        app.saveNoValidate(song);
      }
    }

    // исходные имена аудиофайлов заметки (PocketBase убирает из имён кириллицу): по порядку
    // файлов в поле audio
    const notes = app.findCollectionByNameOrId('notes');

    if (!notes.fields.getByName('audio_names')) {
      notes.fields.add(
        new Field({ name: 'audio_names', type: 'json', maxSize: 5000 })
      );
      app.save(notes);
    }

    if (!projects.fields.getByName('links')) {
      projects.fields.add(
        new Field({ name: 'links', type: 'json', maxSize: 10000 })
      );
      app.save(projects);
    }

    for (const name of TIMED_COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);

      if (!collection.fields.getByName('time')) {
        collection.fields.add(
          new Field({ name: 'time', type: 'text', pattern: TIME_PATTERN })
        );
        app.save(collection);
      }
    }

    const viewRule = `${TOTP_CONFIRMED} && ${getAnyRoleCondition('project.')}`;
    const workRule = `${TOTP_CONFIRMED} && ${getWorkerCondition('project.')}`;
    const posts = new Collection({
      type: 'base',
      name: 'posts',
      listRule: viewRule,
      viewRule: viewRule,
      createRule: `${workRule} && @request.body.author = @request.auth.id`,
      updateRule: `${workRule} && @request.body.project:isset = false && @request.body.author:isset = false`,
      deleteRule: workRule,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'song',
          type: 'relation',
          collectionId: songs.id,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'text', type: 'text', max: 10000 },
        // площадки: ["instagram", "youtube", ...]
        { name: 'platforms', type: 'json', maxSize: 2000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['idea', 'preparing', 'ready', 'published'],
        },
        {
          name: 'anchor',
          type: 'select',
          maxSelect: 1,
          values: ['date', 'release'],
        },
        { name: 'date', type: 'date' },
        { name: 'offset', type: 'number', onlyInt: true, min: -365, max: 365 },
        { name: 'time', type: 'text', pattern: TIME_PATTERN },
        {
          name: 'assignees',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 20,
        },
        {
          name: 'author',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_posts_project ON posts (project, date)'],
    });
    app.save(posts);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('posts'));
    for (const name of TIMED_COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.removeByName('time');
      app.save(collection);
    }
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.removeByName('audio_names');
    app.save(notes);
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.removeByName('links');
    app.save(projects);
    for (const song of app.findRecordsByFilter(
      'songs',
      `status = "${NOT_STARTED_STATUS}"`,
      '',
      0,
      0
    )) {
      song.set('status', ACTIVE_STATUS);
      app.saveNoValidate(song);
    }
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('status').values = [
      'active',
      'paused',
      'done',
      'sent',
      'released',
    ];
    app.save(songs);
  }
);
