/// <reference path="../pb_data/types.d.ts" />

// Роли в проекте. У проекта владелец и три списка участников:
//   editors      - редакторы: песни, этапы, обложки, текст, релиз, шаблон этапов, заметки;
//   contributors - участники: статусы, сроки и подэтапы этапов, заметки с картинками и аудио;
//   viewers      - наблюдатели: только смотрят.
// Название, аватар, участников и удаление проекта меняет только владелец. Создавать проекты
// может главный и те, кому он это разрешил (users.can_create_projects).
//
// Прежние участники (members) становятся редакторами: у них остаются все права, что были.

/** Пользователь вошёл и подключил 2FA */
const TOTP_CONFIRMED =
  '@request.auth.id != "" && @request.auth.totp_enabled = true';

/** Служебные поля 2FA меняют только хуки */
const NO_TOTP_FIELDS = [
  'totp_enabled',
  'totp_secret',
  'totp_pending',
  'totp_step',
]
  .map((field) => `@request.body.${field}:isset = false`)
  .join(' && ');

/** Заметки: песня и этап - того же проекта */
const SAME_PROJECT = [
  '(@request.body.song:isset = false || @request.body.song = "" || song.project = project)',
  '(@request.body.stage:isset = false || @request.body.stage = "" || stage.song = song)',
].join(' && ');

/** Не автор меняет в заметке только "стала песней" */
const ONLY_BECAME_SONG = [
  'text',
  'audio',
  'images',
  'author',
  'project',
  'song',
  'stage',
]
  .map((field) => `@request.body.${field}:changed = false`)
  .join(' && ');

/** Автор не уносит заметку в другой проект, песню или этап */
const OWN_NOTE = ['author = @request.auth.id']
  .concat(
    ['author', 'project', 'song', 'stage'].map(
      (field) => `@request.body.${field}:isset = false`
    )
  )
  .join(' && ');

/** Любая роль в проекте; prefix - путь от записи до проекта ("", "project.", "song.project.") */
function getAnyRoleCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id || ${prefix}viewers.id ?= @request.auth.id)`;
}

/** Владелец или редактор проекта */
function getEditorCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id)`;
}

/** Владелец, редактор или участник проекта: все, кроме наблюдателей */
function getWorkerCondition(prefix) {
  return `(${prefix}owner = @request.auth.id || ${prefix}editors.id ?= @request.auth.id || ${prefix}contributors.id ?= @request.auth.id)`;
}

/** Поля fields в запросе не передаются */
function getUnsetCondition(fields) {
  return fields
    .map((field) => `@request.body.${field}:isset = false`)
    .join(' && ');
}

/** Смотреть: любая роль с подключённой 2FA */
function getViewRule(prefix) {
  return `${TOTP_CONFIRMED} && ${getAnyRoleCondition(prefix)}`;
}

/** Менять состав: владелец или редактор с подключённой 2FA */
function getEditRule(prefix) {
  return `${TOTP_CONFIRMED} && ${getEditorCondition(prefix)}`;
}

/** Работать: все, кроме наблюдателей, с подключённой 2FA */
function getWorkRule(prefix) {
  return `${TOTP_CONFIRMED} && ${getWorkerCondition(prefix)}`;
}

/** Записи, которые меняют только редакторы: шаблон этапов, песни */
function getEditorRules(prefix, lockedFields) {
  return {
    listRule: getViewRule(prefix),
    viewRule: getViewRule(prefix),
    createRule: getEditRule(prefix),
    updateRule: `${getEditRule(prefix)} && ${getUnsetCondition(lockedFields)}`,
    deleteRule: getEditRule(prefix),
  };
}

/** Роли: списки участников проекта и правила записей по ролям */
function applyRoles(app) {
  const users = app.findCollectionByNameOrId('users');

  if (!users.fields.getByName('can_create_projects')) {
    users.fields.add(new Field({ name: 'can_create_projects', type: 'bool' }));
  }

  users.createRule = `${TOTP_CONFIRMED} && @request.auth.is_admin = true && ${NO_TOTP_FIELDS}`;
  // себе - имя, фото и пароль; права меняет только главный
  users.updateRule = `${TOTP_CONFIRMED} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && ${getUnsetCondition(['is_admin', 'username', 'can_create_projects'])}) || @request.auth.is_admin = true)`;
  app.save(users);

  const projects = app.findCollectionByNameOrId('projects');
  const membersField = projects.fields.getByName('members');

  if (membersField) {
    membersField.name = 'editors';
  }

  for (const name of ['contributors', 'viewers']) {
    if (!projects.fields.getByName(name)) {
      projects.fields.add(
        new Field({
          name,
          type: 'relation',
          collectionId: users.id,
          maxSelect: 50,
        })
      );
    }
  }
  projects.listRule = getViewRule('');
  projects.viewRule = getViewRule('');
  projects.createRule = `${TOTP_CONFIRMED} && @request.body.owner = @request.auth.id && (@request.auth.is_admin = true || @request.auth.can_create_projects = true)`;
  projects.updateRule = `${TOTP_CONFIRMED} && owner = @request.auth.id && @request.body.owner:isset = false`;
  projects.deleteRule = `${TOTP_CONFIRMED} && owner = @request.auth.id`;
  app.save(projects);

  const templates = app.findCollectionByNameOrId('stage_templates');
  Object.assign(templates, getEditorRules('project.', ['project']));
  app.save(templates);

  const songs = app.findCollectionByNameOrId('songs');
  Object.assign(songs, getEditorRules('project.', ['project']));
  app.save(songs);

  // этапы: состав и порядок - редакторы; статус, срок и подэтапы - ещё и участники
  const stages = app.findCollectionByNameOrId('song_stages');
  const stagePrefix = 'song.project.';
  stages.listRule = getViewRule(stagePrefix);
  stages.viewRule = getViewRule(stagePrefix);
  stages.createRule = getEditRule(stagePrefix);
  stages.updateRule = `${getWorkRule(stagePrefix)} && ${getUnsetCondition(['song'])} && (${getEditorCondition(stagePrefix)} || (${getUnsetCondition(['title', 'position'])}))`;
  stages.deleteRule = getEditRule(stagePrefix);
  app.save(stages);

  // заметки пишут участники и редакторы; правит и удаляет автор, удалить чужую может редактор
  const notes = app.findCollectionByNameOrId('notes');
  const notePrefix = 'project.';
  notes.listRule = getViewRule(notePrefix);
  notes.viewRule = getViewRule(notePrefix);
  notes.createRule = `${getWorkRule(notePrefix)} && @request.body.author = @request.auth.id && ${SAME_PROJECT}`;
  notes.updateRule = `${getWorkRule(notePrefix)} && ((${OWN_NOTE}) || (${getEditorCondition(notePrefix)} && ${ONLY_BECAME_SONG}))`;
  notes.deleteRule = `${getWorkRule(notePrefix)} && (author = @request.auth.id || ${getEditorCondition(notePrefix)})`;
  app.save(notes);

  // кто уже работал в системе, проекты создавать может и дальше
  for (const user of app.findAllRecords('users')) {
    user.set('can_create_projects', true);
    app.saveNoValidate(user);
  }
}

/**
 * Откат - к схеме 1762000000_bounce.js: один список участников (members) с полными правами и
 * прежние правила
 *
 * Правила проекта меняются вместе с переименованием поля, иначе сохранение не пройдёт проверку:
 * в них остались бы editors, contributors и viewers. Правила записей, которые ссылаются на поля
 * проекта, - после сохранения проекта, когда members уже есть. Права в users
 * (can_create_projects) не трогаются: поле лишнее, но правила users на него ссылаются, а
 * значения при повторном up всё равно выставляются заново
 */
function revertRoles(app) {
  const getMemberCondition = (prefix) =>
    `(${prefix}owner = @request.auth.id || ${prefix}members.id ?= @request.auth.id)`;
  const getAccessRule = (prefix) =>
    `${TOTP_CONFIRMED} && ${getMemberCondition(prefix)}`;
  const getOldRules = (prefix, lockedFields) => ({
    listRule: getAccessRule(prefix),
    viewRule: getAccessRule(prefix),
    createRule: getAccessRule(prefix),
    updateRule: `${getAccessRule(prefix)} && ${getUnsetCondition(lockedFields)}`,
    deleteRule: getAccessRule(prefix),
  });

  const projects = app.findCollectionByNameOrId('projects');
  projects.fields.removeByName('contributors');
  projects.fields.removeByName('viewers');
  const editorsField = projects.fields.getByName('editors');

  if (editorsField) {
    editorsField.name = 'members';
  }

  projects.listRule = getAccessRule('');
  projects.viewRule = getAccessRule('');
  projects.createRule = `${TOTP_CONFIRMED} && @request.body.owner = @request.auth.id`;
  app.save(projects);

  for (const [name, prefix, lockedFields] of [
    ['stage_templates', 'project.', ['project']],
    ['songs', 'project.', ['project']],
    ['song_stages', 'song.project.', ['song']],
  ]) {
    const collection = app.findCollectionByNameOrId(name);
    Object.assign(collection, getOldRules(prefix, lockedFields));
    app.save(collection);
  }

  const notes = app.findCollectionByNameOrId('notes');
  const noteAccessRule = getAccessRule('project.');
  notes.listRule = noteAccessRule;
  notes.viewRule = noteAccessRule;
  notes.createRule = `${noteAccessRule} && @request.body.author = @request.auth.id && ${SAME_PROJECT}`;
  notes.updateRule = `${noteAccessRule} && ((${OWN_NOTE}) || (${ONLY_BECAME_SONG}))`;
  notes.deleteRule = `${noteAccessRule} && author = @request.auth.id`;
  app.save(notes);
}

migrate(applyRoles, revertRoles);
