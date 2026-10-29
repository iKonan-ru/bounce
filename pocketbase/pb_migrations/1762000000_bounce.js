/// <reference path="../pb_data/types.d.ts" />

// Схема Bounce. Верхний уровень - проект: его видят владелец и участники. Пользователей заводит
// главный (is_admin), вход по логину, паролю и коду TOTP (pb_hooks/totp.pb.js); пока 2FA не
// подключена, данные недоступны: в каждом правиле есть TOTP_CONFIRMED.
//
// Миграция заменила прежние (init, settings, links_and_locks): учётные записи остаются как
// есть, а коллекции с данными пересоздаются с нуля.

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED = '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Служебные поля 2FA меняют только хуки */
const NO_TOTP_FIELDS = ['totp_enabled', 'totp_secret', 'totp_pending', 'totp_step']
  .map((field) => `@request.body.${field}:isset = false`)
  .join(' && ');

/** Участник проекта; prefix - путь от записи до проекта ("", "project.", "song.project.") */
function getMemberCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}members.id ?= @request.auth.id)`;
}

/** Доступ к записи проекта: 2FA подключена, пользователь - участник проекта */
function getProjectAccessRule(prefix) {
  return `${TOTP_CONFIRMED} && ${getMemberCondition(prefix)}`;
}

/** Поля-связи, которые после создания не меняются: запись нельзя унести в другой проект */
function getLockedCondition(fields) {
  return fields.map((field) => `@request.body.${field}:isset = false`).join(' && ');
}

/** Правила записи проекта: всё доступно участникам, поля-связи lockedFields не меняются */
function getCollectionRules(prefix, lockedFields) {
  const accessRule = getProjectAccessRule(prefix);
  return {
    listRule: accessRule,
    viewRule: accessRule,
    createRule: accessRule,
    updateRule: `${accessRule} && ${getLockedCondition(lockedFields)}`,
    deleteRule: accessRule,
  };
}

/** Поля created и updated, которые PocketBase заполняет сам */
function getTimestampFields() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
}

/** Связь с одной записью коллекции collectionId; extra - дополнительные настройки поля */
function getRelationField(name, collectionId, extra) {
  return { name, type: 'relation', collectionId, maxSelect: 1, ...extra };
}

/** Байт в мегабайте */
const BYTES_IN_MEGABYTE = 1024 * 1024;

/** Записи с телефона: Safari пишет audio/mp4, Chrome - webm (их распознают и как video/*) */
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

/** Типы картинок в полях с изображениями */
const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

/** Закрытое поле с картинками; thumbs - размеры уменьшенных копий */
function getImagesField(name, maxSelect, thumbs) {
  return {
    name,
    type: 'file',
    maxSelect,
    maxSize: 20 * BYTES_IN_MEGABYTE,
    mimeTypes: IMAGE_TYPES,
    thumbs,
    protected: true,
  };
}

/** Коллекции с данными, которые миграция пересоздаёт с нуля */
const DATA_COLLECTIONS = [
  'findings',
  'notes',
  'lyrics',
  'song_stages',
  'songs',
  'stage_templates',
  'projects',
];

/** Удалить коллекции с данными; тех, что нет, пропустить */
function dropDataCollections(app) {
  for (const name of DATA_COLLECTIONS) {
    let collection = null;
    try {
      collection = app.findCollectionByNameOrId(name);
    } catch (_error) {
      continue;
    }
    app.delete(collection);
  }
}

/** Учётные записи: недостающие поля, вход по логину и правила доступа */
function setupUsers(app) {
  const users = app.findCollectionByNameOrId('users');
  const addField = (fieldOptions) => {
    if (!users.fields.getByName(fieldOptions.name)) {
      users.fields.add(new Field(fieldOptions));
    }
  };
  addField({
    name: 'username',
    type: 'text',
    required: true,
    min: 3,
    max: 32,
    pattern: '^[a-z0-9][a-z0-9_.-]*$',
  });
  addField({ name: 'is_admin', type: 'bool' });
  addField({ name: 'totp_enabled', type: 'bool' });
  addField({ name: 'totp_secret', type: 'text', hidden: true });
  addField({ name: 'totp_pending', type: 'text', hidden: true });
  addField({ name: 'totp_step', type: 'number', onlyInt: true, hidden: true });
  const nameField = users.fields.getByName('name');
  nameField.required = true;
  nameField.max = 60;
  // почта не нужна: вход по логину
  users.fields.getByName('email').required = false;
  users.addIndex('idx_users_username', true, 'username', '');
  users.passwordAuth.identityFields = ['username'];
  users.oauth2.enabled = false;
  users.otp.enabled = false;
  users.mfa.enabled = false;
  // ссылки на закрытые файлы (аудио в плеере) живут час: перемотка не ломается на полуслове
  users.fileToken.duration = 3600;

  users.listRule = TOTP_CONFIRMED;
  users.viewRule = TOTP_CONFIRMED;
  // заводит учётные записи только главный
  users.createRule = `${TOTP_CONFIRMED} && @request.auth.is_admin = true && ${NO_TOTP_FIELDS}`;
  // себя - имя и пароль (PocketBase требует старый пароль), главный - любого
  users.updateRule = `${TOTP_CONFIRMED} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.username:isset = false) || @request.auth.is_admin = true)`;
  users.deleteRule = `${TOTP_CONFIRMED} && @request.auth.is_admin = true && id != @request.auth.id`;
  app.save(users);
  return users;
}

/** Настройки приложения: адрес, пакетные запросы, прокси, ограничение частоты, копии */
function setupSettings(app) {
  const settings = app.settings();
  settings.meta.appName = 'Bounce';
  const appUrl = $os.getenv('BOUNCE_URL');
  if (appUrl) {
    settings.meta.appURL = appUrl;
  }
  // песня и её этапы создаются одной транзакцией
  settings.batch.enabled = true;
  settings.batch.maxRequests = 200;
  // Caddy передаёт адрес клиента в X-Forwarded-For; без этого все запросы были бы "от Caddy"
  settings.trustedProxy.headers = ['X-Forwarded-For'];
  settings.trustedProxy.useLeftmostIP = false;
  settings.rateLimits.enabled = true;
  // автоматических копий нет: главный скачивает копию сам (pb_hooks/backup.pb.js)
  settings.backups.cron = '';
  settings.backups.cronMaxKeep = 1;
  app.save(settings);
}

/** Схема с нуля: настройки, учётные записи и коллекции с данными */
function createSchema(app) {
  setupSettings(app);
  dropDataCollections(app);
  const users = setupUsers(app);

  const projects = new Collection({
    type: 'base',
    name: 'projects',
    listRule: getProjectAccessRule(''),
    viewRule: getProjectAccessRule(''),
    createRule: `${TOTP_CONFIRMED} && @request.body.owner = @request.auth.id`,
    // владелец меняет название, аватар и участников; передать проект нельзя
    updateRule: `${TOTP_CONFIRMED} && owner = @request.auth.id && @request.body.owner:isset = false`,
    deleteRule: `${TOTP_CONFIRMED} && owner = @request.auth.id`,
    fields: [
      { name: 'name', type: 'text', required: true, max: 120 },
      getRelationField('owner', users.id, { required: true }),
      { name: 'members', type: 'relation', collectionId: users.id, maxSelect: 50 },
      getImagesField('avatar', 1, ['96x96', '256x256']),
      ...getTimestampFields(),
    ],
  });
  app.save(projects);

  const templates = new Collection({
    type: 'base',
    name: 'stage_templates',
    ...getCollectionRules('project.', ['project']),
    fields: [
      getRelationField('project', projects.id, { required: true, cascadeDelete: true }),
      { name: 'title', type: 'text', required: true, max: 120 },
      { name: 'position', type: 'number', onlyInt: true, min: 0 },
      // подэтапы: массив { id, title }
      { name: 'substeps', type: 'json', maxSize: 20000 },
      ...getTimestampFields(),
    ],
    indexes: ['CREATE INDEX idx_stage_templates_project ON stage_templates (project, position)'],
  });
  app.save(templates);

  const songs = new Collection({
    type: 'base',
    name: 'songs',
    ...getCollectionRules('project.', ['project']),
    fields: [
      getRelationField('project', projects.id, { required: true, cascadeDelete: true }),
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
      getImagesField('covers', 30, ['96x96', '600x600']),
      // имя файла основной обложки из covers; пусто - первая по порядку
      { name: 'main_cover', type: 'text', max: 200 },
      ...getTimestampFields(),
    ],
    indexes: ['CREATE INDEX idx_songs_project ON songs (project)'],
  });
  app.save(songs);

  const stages = new Collection({
    type: 'base',
    name: 'song_stages',
    ...getCollectionRules('song.project.', ['song']),
    fields: [
      getRelationField('song', songs.id, { required: true, cascadeDelete: true }),
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
      ...getTimestampFields(),
    ],
    indexes: ['CREATE INDEX idx_song_stages_song ON song_stages (song, position)'],
  });
  app.save(stages);

  // Заметки проекта, песни или этапа: текст, картинки, аудио. Песня и этап - того же проекта.
  const noteAccessRule = getProjectAccessRule('project.');
  const sameProject =
    '(@request.body.song:isset = false || @request.body.song = "" || song.project = project) && (@request.body.stage:isset = false || @request.body.stage = "" || stage.song = song)';
  // не автор может только связать заметку с песней, которая из неё получилась
  const onlyBecameSong = ['text', 'audio', 'images', 'author', 'project', 'song', 'stage']
    .map((field) => `@request.body.${field}:changed = false`)
    .join(' && ');
  const notes = new Collection({
    type: 'base',
    name: 'notes',
    listRule: noteAccessRule,
    viewRule: noteAccessRule,
    createRule: `${noteAccessRule} && @request.body.author = @request.auth.id && ${sameProject}`,
    updateRule: `${noteAccessRule} && ((author = @request.auth.id && ${getLockedCondition(['author', 'project', 'song', 'stage'])}) || (${onlyBecameSong}))`,
    deleteRule: `${noteAccessRule} && author = @request.auth.id`,
    fields: [
      getRelationField('project', projects.id, { required: true, cascadeDelete: true }),
      getRelationField('song', songs.id, { cascadeDelete: true }),
      getRelationField('stage', stages.id, { cascadeDelete: true }),
      { name: 'text', type: 'text', max: 10000 },
      getImagesField('images', 10, ['480x0']),
      {
        name: 'audio',
        type: 'file',
        maxSelect: 5,
        maxSize: 200 * BYTES_IN_MEGABYTE,
        mimeTypes: AUDIO_TYPES,
        protected: true,
      },
      // песня, которая выросла из заметки проекта
      getRelationField('became_song', songs.id),
      getRelationField('author', users.id, { required: true }),
      ...getTimestampFields(),
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
// коллекции с нуля (dropDataCollections) - данные проектов, песен и заметок пропадут; users
// только дополняется недостающим. Полный откат на сервере с данными не делать.
migrate(createSchema, () => {
  // откат схемы не делается: см. комментарий выше
});
