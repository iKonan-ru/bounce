/// <reference path="../pb_data/types.d.ts" />

// Схема Bounce. Верхний уровень - проект: его видят владелец и участники. Пользователей заводит
// главный (is_admin), вход по логину, паролю и коду TOTP (pb_hooks/totp.pb.js); пока 2FA не
// подключена, данные недоступны: в каждом правиле есть TOTP_OK.

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
// служебные поля 2FA меняют только хуки
const NO_TOTP_FIELDS = ['totp_enabled', 'totp_secret', 'totp_pending', 'totp_step']
  .map((f) => `@request.body.${f}:isset = false`)
  .join(' && ');

// участник проекта; prefix - путь от записи до проекта ("", "project.", "song.project.")
function member(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}members.id ?= @request.auth.id)`;
}

function inProject(prefix) {
  return `${TOTP_OK} && ${member(prefix)}`;
}

function rules(prefix, createExtra) {
  const base = inProject(prefix);
  return {
    listRule: base,
    viewRule: base,
    createRule: createExtra ? `${base} && ${createExtra}` : base,
    updateRule: base,
    deleteRule: base,
  };
}

const AUTHOR_IS_ME = '@request.body.author = @request.auth.id';

function timestamps() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
}

function relation(name, collectionId, extra) {
  return { name, type: 'relation', collectionId, maxSelect: 1, ...extra };
}

const MB = 1024 * 1024;
// записи с телефона: Safari пишет audio/mp4, Chrome - webm (их распознают и как video/*)
const AUDIO_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/webm',
];
const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

function audioField(name) {
  return {
    name,
    type: 'file',
    maxSelect: 5,
    maxSize: 200 * MB,
    mimeTypes: AUDIO_TYPES,
    protected: true,
  };
}

function imagesField(name) {
  return {
    name,
    type: 'file',
    maxSelect: 10,
    maxSize: 20 * MB,
    mimeTypes: IMAGE_TYPES,
    thumbs: ['480x0'],
    protected: true,
  };
}

const STAGE_STATUSES = ['not_started', 'in_progress', 'review', 'done', 'skipped'];
const INSTRUMENTS = ['vocals', 'guitar', 'bass', 'drums', 'synths', 'mix', 'master'];
const CATEGORIES = ['preamp', 'processor', 'cabinet', 'mic', 'plugin', 'technique', 'other'];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.add(
      new Field({
        name: 'username',
        type: 'text',
        required: true,
        min: 3,
        max: 32,
        pattern: '^[a-z0-9][a-z0-9_.-]*$',
      }),
    );
    users.fields.add(new Field({ name: 'is_admin', type: 'bool' }));
    users.fields.add(new Field({ name: 'totp_enabled', type: 'bool' }));
    users.fields.add(new Field({ name: 'totp_secret', type: 'text', hidden: true }));
    users.fields.add(new Field({ name: 'totp_pending', type: 'text', hidden: true }));
    users.fields.add(new Field({ name: 'totp_step', type: 'number', onlyInt: true, hidden: true }));
    const name = users.fields.getByName('name');
    name.required = true;
    name.max = 60;
    // почта не нужна: вход по логину
    users.fields.getByName('email').required = false;
    users.addIndex('idx_users_username', true, 'username', '');
    users.passwordAuth.identityFields = ['username'];
    users.oauth2.enabled = false;
    users.otp.enabled = false;
    users.mfa.enabled = false;
    // ссылки на закрытые файлы (аудио в плеере) живут час: перемотка не ломается на полуслове
    users.fileToken.duration = 3600;

    users.listRule = TOTP_OK;
    users.viewRule = TOTP_OK;
    // заводит учётные записи только главный
    users.createRule = `${TOTP_OK} && @request.auth.is_admin = true && ${NO_TOTP_FIELDS}`;
    // себя - имя и пароль (PocketBase требует старый пароль), главный - любого
    users.updateRule = `${TOTP_OK} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.username:isset = false) || @request.auth.is_admin = true)`;
    users.deleteRule = `${TOTP_OK} && @request.auth.is_admin = true && id != @request.auth.id`;
    app.save(users);

    const projects = new Collection({
      type: 'base',
      name: 'projects',
      listRule: inProject(''),
      viewRule: inProject(''),
      createRule: `${TOTP_OK} && @request.body.owner = @request.auth.id`,
      // владелец меняет название и участников; передать проект нельзя
      updateRule: `${TOTP_OK} && owner = @request.auth.id && @request.body.owner:isset = false`,
      deleteRule: `${TOTP_OK} && owner = @request.auth.id`,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120 },
        relation('owner', users.id, { required: true }),
        { name: 'members', type: 'relation', collectionId: users.id, maxSelect: 50 },
        ...timestamps(),
      ],
    });
    app.save(projects);

    const templates = new Collection({
      type: 'base',
      name: 'stage_templates',
      ...rules('project.'),
      fields: [
        relation('project', projects.id, { required: true, cascadeDelete: true }),
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'position', type: 'number', onlyInt: true, min: 0 },
        { name: 'optional', type: 'bool' },
        // подэтапы: массив строк
        { name: 'substeps', type: 'json', maxSize: 20000 },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_stage_templates_project ON stage_templates (project, position)'],
    });
    app.save(templates);

    const songs = new Collection({
      type: 'base',
      name: 'songs',
      ...rules('project.'),
      fields: [
        relation('project', projects.id, { required: true, cascadeDelete: true }),
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
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_songs_project ON songs (project)'],
    });
    app.save(songs);

    const stages = new Collection({
      type: 'base',
      name: 'song_stages',
      ...rules('song.project.'),
      fields: [
        relation('song', songs.id, { required: true, cascadeDelete: true }),
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

    const inSong = inProject('song.project.');
    const lyrics = new Collection({
      type: 'base',
      name: 'lyrics',
      // версии текста только добавляются: текущий текст - последняя версия песни
      listRule: inSong,
      viewRule: inSong,
      createRule: `${inSong} && ${AUTHOR_IS_ME}`,
      updateRule: null,
      deleteRule: null,
      fields: [
        relation('song', songs.id, { required: true, cascadeDelete: true }),
        { name: 'text', type: 'text', max: 50000 },
        relation('author', users.id, { required: true }),
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_lyrics_song ON lyrics (song, created)'],
    });
    app.save(lyrics);

    // Лента: идеи и комментарии проекта, песни или этапа. Песня и этап - того же проекта.
    const inNoteProject = inProject('project.');
    const sameProject =
      '(@request.body.song:isset = false || @request.body.song = "" || song.project = project) && (@request.body.stage:isset = false || @request.body.stage = "" || stage.song = song)';
    // не автор может только отметить идею использованной: остальные поля не меняются
    // (:changed сравнивает итог, так что audio+ и images+ тоже не пройдут)
    const onlyUsed = ['text', 'kind', 'audio', 'images', 'author', 'project', 'song', 'stage']
      .map((f) => `@request.body.${f}:changed = false`)
      .join(' && ');
    const notes = new Collection({
      type: 'base',
      name: 'notes',
      listRule: inNoteProject,
      viewRule: inNoteProject,
      createRule: `${inNoteProject} && ${AUTHOR_IS_ME} && ${sameProject}`,
      updateRule: `${inNoteProject} && ((author = @request.auth.id && @request.body.author:isset = false && @request.body.project:isset = false && @request.body.song:isset = false && @request.body.stage:isset = false) || (${onlyUsed}))`,
      deleteRule: `${inNoteProject} && author = @request.auth.id`,
      fields: [
        relation('project', projects.id, { required: true, cascadeDelete: true }),
        relation('song', songs.id, { cascadeDelete: true }),
        relation('stage', stages.id, { cascadeDelete: true }),
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['comment', 'idea'] },
        { name: 'text', type: 'text', max: 10000 },
        audioField('audio'),
        imagesField('images'),
        // идея пошла в дело
        { name: 'used', type: 'bool' },
        relation('author', users.id, { required: true }),
        ...timestamps(),
      ],
      indexes: [
        'CREATE INDEX idx_notes_project ON notes (project, created)',
        'CREATE INDEX idx_notes_song ON notes (song, created)',
        'CREATE INDEX idx_notes_stage ON notes (stage, created)',
      ],
    });
    app.save(notes);

    const findings = new Collection({
      type: 'base',
      name: 'findings',
      ...rules('project.', AUTHOR_IS_ME),
      fields: [
        relation('project', projects.id, { required: true, cascadeDelete: true }),
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 20000 },
        // значения настроек текстом: "Gain 3, Bass 6, Presence 7"
        { name: 'settings', type: 'text', max: 20000 },
        { name: 'instrument', type: 'select', maxSelect: 1, values: INSTRUMENTS },
        { name: 'category', type: 'select', maxSelect: 1, values: CATEGORIES },
        { name: 'tags', type: 'json', maxSize: 5000 },
        imagesField('images'),
        // "в библиотеку": пресет, который стоит применять в других песнях
        { name: 'library', type: 'bool' },
        relation('song', songs.id),
        relation('stage', stages.id),
        relation('author', users.id, { required: true }),
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_findings_project ON findings (project, created)'],
    });
    app.save(findings);
  },
  (app) => {
    for (const name of [
      'findings',
      'notes',
      'lyrics',
      'song_stages',
      'songs',
      'stage_templates',
      'projects',
    ]) {
      app.delete(app.findCollectionByNameOrId(name));
    }
    const users = app.findCollectionByNameOrId('users');
    for (const f of [
      'username',
      'is_admin',
      'totp_enabled',
      'totp_secret',
      'totp_pending',
      'totp_step',
    ]) {
      users.fields.removeByName(f);
    }
    users.removeIndex('idx_users_username');
    users.passwordAuth.identityFields = ['email'];
    users.fields.getByName('email').required = true;
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = 'id = @request.auth.id';
    app.save(users);
  },
);
