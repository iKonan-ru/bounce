/// <reference path="../pb_data/types.d.ts" />

// Схема Bounce. Верхний уровень - проект: его видят владелец и участники. Пользователей заводит
// главный (is_admin), вход по логину, паролю и коду TOTP (pb_hooks/totp.pb.js); пока 2FA не
// подключена, данные недоступны: в каждом правиле есть TOTP_OK.
//
// Миграция заменила прежние (init, settings, links_and_locks): учётные записи остаются как
// есть, а коллекции с данными пересоздаются с нуля.

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

// поля-связи, которые после создания не меняются: запись нельзя унести в другой проект
function locked(fields) {
  return fields.map((f) => `@request.body.${f}:isset = false`).join(' && ');
}

function rules(prefix, lockedFields) {
  const base = inProject(prefix);
  return {
    listRule: base,
    viewRule: base,
    createRule: base,
    updateRule: `${base} && ${locked(lockedFields)}`,
    deleteRule: base,
  };
}

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

function imagesField(name, maxSelect, thumbs) {
  return {
    name,
    type: 'file',
    maxSelect,
    maxSize: 20 * MB,
    mimeTypes: IMAGE_TYPES,
    thumbs,
    protected: true,
  };
}

const DATA_COLLECTIONS = [
  'findings',
  'notes',
  'lyrics',
  'song_stages',
  'songs',
  'stage_templates',
  'projects',
];

function dropData(app) {
  for (const name of DATA_COLLECTIONS) {
    let c;
    try {
      c = app.findCollectionByNameOrId(name);
    } catch (_err) {
      continue;
    }
    app.delete(c);
  }
}

function setupUsers(app) {
  const users = app.findCollectionByNameOrId('users');
  const add = (def) => {
    if (!users.fields.getByName(def.name)) users.fields.add(new Field(def));
  };
  add({
    name: 'username',
    type: 'text',
    required: true,
    min: 3,
    max: 32,
    pattern: '^[a-z0-9][a-z0-9_.-]*$',
  });
  add({ name: 'is_admin', type: 'bool' });
  add({ name: 'totp_enabled', type: 'bool' });
  add({ name: 'totp_secret', type: 'text', hidden: true });
  add({ name: 'totp_pending', type: 'text', hidden: true });
  add({ name: 'totp_step', type: 'number', onlyInt: true, hidden: true });
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
  return users;
}

function setupSettings(app) {
  const s = app.settings();
  s.meta.appName = 'Bounce';
  const url = $os.getenv('BOUNCE_URL');
  if (url) s.meta.appURL = url;
  // песня и её этапы создаются одной транзакцией
  s.batch.enabled = true;
  s.batch.maxRequests = 200;
  // Caddy передаёт адрес клиента в X-Forwarded-For; без этого все запросы были бы "от Caddy"
  s.trustedProxy.headers = ['X-Forwarded-For'];
  s.trustedProxy.useLeftmostIP = false;
  s.rateLimits.enabled = true;
  // автоматических копий нет: главный скачивает копию сам (pb_hooks/backup.pb.js)
  s.backups.cron = '';
  s.backups.cronMaxKeep = 1;
  app.save(s);
}

function up(app) {
  setupSettings(app);
  dropData(app);
  const users = setupUsers(app);

  const projects = new Collection({
    type: 'base',
    name: 'projects',
    listRule: inProject(''),
    viewRule: inProject(''),
    createRule: `${TOTP_OK} && @request.body.owner = @request.auth.id`,
    // владелец меняет название, аватар и участников; передать проект нельзя
    updateRule: `${TOTP_OK} && owner = @request.auth.id && @request.body.owner:isset = false`,
    deleteRule: `${TOTP_OK} && owner = @request.auth.id`,
    fields: [
      { name: 'name', type: 'text', required: true, max: 120 },
      relation('owner', users.id, { required: true }),
      { name: 'members', type: 'relation', collectionId: users.id, maxSelect: 50 },
      imagesField('avatar', 1, ['96x96', '256x256']),
      ...timestamps(),
    ],
  });
  app.save(projects);

  const templates = new Collection({
    type: 'base',
    name: 'stage_templates',
    ...rules('project.', ['project']),
    fields: [
      relation('project', projects.id, { required: true, cascadeDelete: true }),
      { name: 'title', type: 'text', required: true, max: 120 },
      { name: 'position', type: 'number', onlyInt: true, min: 0 },
      // подэтапы: массив { id, title }
      { name: 'substeps', type: 'json', maxSize: 20000 },
      ...timestamps(),
    ],
    indexes: ['CREATE INDEX idx_stage_templates_project ON stage_templates (project, position)'],
  });
  app.save(templates);

  const songs = new Collection({
    type: 'base',
    name: 'songs',
    ...rules('project.', ['project']),
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
      { name: 'lyrics', type: 'text', max: 50000 },
      imagesField('covers', 30, ['96x96', '600x600']),
      // имя файла основной обложки из covers; пусто - первая по порядку
      { name: 'main_cover', type: 'text', max: 200 },
      ...timestamps(),
    ],
    indexes: ['CREATE INDEX idx_songs_project ON songs (project)'],
  });
  app.save(songs);

  const stages = new Collection({
    type: 'base',
    name: 'song_stages',
    ...rules('song.project.', ['song']),
    fields: [
      relation('song', songs.id, { required: true, cascadeDelete: true }),
      { name: 'title', type: 'text', required: true, max: 120 },
      { name: 'position', type: 'number', onlyInt: true, min: 0 },
      {
        name: 'status',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['not_started', 'in_progress', 'done', 'skipped'],
      },
      { name: 'deadline', type: 'date' },
      // подэтапы: массив { id, title, done }
      { name: 'substeps', type: 'json', maxSize: 20000 },
      ...timestamps(),
    ],
    indexes: ['CREATE INDEX idx_song_stages_song ON song_stages (song, position)'],
  });
  app.save(stages);

  // Заметки проекта, песни или этапа: текст, картинки, аудио. Песня и этап - того же проекта.
  const inNoteProject = inProject('project.');
  const sameProject =
    '(@request.body.song:isset = false || @request.body.song = "" || song.project = project) && (@request.body.stage:isset = false || @request.body.stage = "" || stage.song = song)';
  // не автор может только связать заметку с песней, которая из неё получилась
  const onlyBecameSong = ['text', 'audio', 'images', 'author', 'project', 'song', 'stage']
    .map((f) => `@request.body.${f}:changed = false`)
    .join(' && ');
  const notes = new Collection({
    type: 'base',
    name: 'notes',
    listRule: inNoteProject,
    viewRule: inNoteProject,
    createRule: `${inNoteProject} && @request.body.author = @request.auth.id && ${sameProject}`,
    updateRule: `${inNoteProject} && ((author = @request.auth.id && ${locked(['author', 'project', 'song', 'stage'])}) || (${onlyBecameSong}))`,
    deleteRule: `${inNoteProject} && author = @request.auth.id`,
    fields: [
      relation('project', projects.id, { required: true, cascadeDelete: true }),
      relation('song', songs.id, { cascadeDelete: true }),
      relation('stage', stages.id, { cascadeDelete: true }),
      { name: 'text', type: 'text', max: 10000 },
      imagesField('images', 10, ['480x0']),
      {
        name: 'audio',
        type: 'file',
        maxSelect: 5,
        maxSize: 200 * MB,
        mimeTypes: AUDIO_TYPES,
        protected: true,
      },
      // песня, которая выросла из заметки проекта
      relation('became_song', songs.id),
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
}

// Откат первой миграции ничего не делает: удалить коллекции - значит потерять все данные.
// Внимание: если после полного отката снова применить миграции, up этой миграции пересоздаст
// коллекции с нуля (dropData) - данные проектов, песен и заметок пропадут; users только
// дополняется недостающим. Полный откат на сервере с данными не делать.
migrate(up, () => {});
