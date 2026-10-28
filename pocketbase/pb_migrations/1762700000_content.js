/// <reference path="../pb_data/types.d.ts" />

// - Песня "не начата": новый статус по умолчанию; когда этап песни берут в работу, песня сама
//   становится "в работе" (pb_hooks/song-status.pb.js). Песни, у которых ни один этап ещё не
//   начат, переводятся в "не начата".
// - Ссылки проекта на страницы в сервисах (links: [{ service, url }]).
// - Исходные имена аудио в заметке (audio_names).
// - Время у сроков плана: "чч:мм", необязательно.
// - Контент-план: публикации проекта (posts) с площадками, статусом и датой - обычной или
//   от даты релиза песни (anchor = release, offset - дней до/после релиза).

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
function anyRole(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id || ${p}contributors.id ?= @request.auth.id || ${p}viewers.id ?= @request.auth.id)`;
}
function worker(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id || ${p}contributors.id ?= @request.auth.id)`;
}
const TIME = '^([01][0-9]|2[0-3]):[0-5][0-9]$';

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
    for (const song of app.findRecordsByFilter('songs', 'status = "active"', '', 0, 0)) {
      const started = app.findRecordsByFilter(
        'song_stages',
        'song = {:s} && (status = "in_progress" || status = "done")',
        '',
        1,
        0,
        { s: song.id },
      );
      if (started.length === 0) {
        song.set('status', 'not_started');
        app.saveNoValidate(song);
      }
    }

    // исходные имена аудиофайлов заметки (PocketBase убирает из имён кириллицу): по порядку
    // файлов в поле audio
    const notes = app.findCollectionByNameOrId('notes');
    if (!notes.fields.getByName('audio_names')) {
      notes.fields.add(new Field({ name: 'audio_names', type: 'json', maxSize: 5000 }));
      app.save(notes);
    }

    if (!projects.fields.getByName('links')) {
      projects.fields.add(new Field({ name: 'links', type: 'json', maxSize: 10000 }));
      app.save(projects);
    }

    for (const name of ['tasks', 'song_stages']) {
      const c = app.findCollectionByNameOrId(name);
      if (!c.fields.getByName('time')) {
        c.fields.add(new Field({ name: 'time', type: 'text', pattern: TIME }));
        app.save(c);
      }
    }

    const view = `${TOTP_OK} && ${anyRole('project.')}`;
    const work = `${TOTP_OK} && ${worker('project.')}`;
    const posts = new Collection({
      type: 'base',
      name: 'posts',
      listRule: view,
      viewRule: view,
      createRule: `${work} && @request.body.author = @request.auth.id`,
      updateRule: `${work} && @request.body.project:isset = false && @request.body.author:isset = false`,
      deleteRule: work,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'song', type: 'relation', collectionId: songs.id, maxSelect: 1 },
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
        { name: 'anchor', type: 'select', maxSelect: 1, values: ['date', 'release'] },
        { name: 'date', type: 'date' },
        { name: 'offset', type: 'number', onlyInt: true, min: -365, max: 365 },
        { name: 'time', type: 'text', pattern: TIME },
        { name: 'assignees', type: 'relation', collectionId: users.id, maxSelect: 20 },
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
    for (const name of ['tasks', 'song_stages']) {
      const c = app.findCollectionByNameOrId(name);
      c.fields.removeByName('time');
      app.save(c);
    }
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.removeByName('audio_names');
    app.save(notes);
    const projects = app.findCollectionByNameOrId('projects');
    projects.fields.removeByName('links');
    app.save(projects);
    for (const song of app.findRecordsByFilter('songs', 'status = "not_started"', '', 0, 0)) {
      song.set('status', 'active');
      app.saveNoValidate(song);
    }
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.getByName('status').values = ['active', 'paused', 'done', 'sent', 'released'];
    app.save(songs);
  },
);
