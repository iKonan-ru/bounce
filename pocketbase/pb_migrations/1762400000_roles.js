/// <reference path="../pb_data/types.d.ts" />

// Роли в проекте. У проекта владелец и три списка участников:
//   editors      - редакторы: песни, этапы, обложки, текст, релиз, шаблон этапов, заметки;
//   contributors - участники: статусы, сроки и подэтапы этапов, заметки с картинками и аудио;
//   viewers      - наблюдатели: только смотрят.
// Название, аватар, участников и удаление проекта меняет только владелец. Создавать проекты
// может главный и те, кому он это разрешил (users.can_create_projects).
//
// Прежние участники (members) становятся редакторами: у них остаются все права, что были.

const TOTP_OK = '@request.auth.id != "" && @request.auth.totp_enabled = true';
const NO_TOTP_FIELDS = ['totp_enabled', 'totp_secret', 'totp_pending', 'totp_step']
  .map((f) => `@request.body.${f}:isset = false`)
  .join(' && ');

// prefix - путь от записи до проекта ("", "project.", "song.project.")
function anyRole(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id || ${p}contributors.id ?= @request.auth.id || ${p}viewers.id ?= @request.auth.id)`;
}
function editor(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id)`;
}
function worker(p) {
  return `(${p}owner = @request.auth.id || ${p}editors.id ?= @request.auth.id || ${p}contributors.id ?= @request.auth.id)`;
}
function unset(fields) {
  return fields.map((f) => `@request.body.${f}:isset = false`).join(' && ');
}

function view(p) {
  return `${TOTP_OK} && ${anyRole(p)}`;
}
function edit(p) {
  return `${TOTP_OK} && ${editor(p)}`;
}
function work(p) {
  return `${TOTP_OK} && ${worker(p)}`;
}

// записи, которые меняют только редакторы: шаблон этапов, песни
function editorRules(p, lockedFields) {
  return {
    listRule: view(p),
    viewRule: view(p),
    createRule: edit(p),
    updateRule: `${edit(p)} && ${unset(lockedFields)}`,
    deleteRule: edit(p),
  };
}

function apply(app) {
  const users = app.findCollectionByNameOrId('users');
  if (!users.fields.getByName('can_create_projects')) {
    users.fields.add(new Field({ name: 'can_create_projects', type: 'bool' }));
  }
  users.createRule = `${TOTP_OK} && @request.auth.is_admin = true && ${NO_TOTP_FIELDS}`;
  // себе - имя, фото и пароль; права меняет только главный
  users.updateRule = `${TOTP_OK} && ${NO_TOTP_FIELDS} && ((id = @request.auth.id && ${unset(['is_admin', 'username', 'can_create_projects'])}) || @request.auth.is_admin = true)`;
  app.save(users);

  const projects = app.findCollectionByNameOrId('projects');
  const members = projects.fields.getByName('members');
  if (members) members.name = 'editors';
  for (const name of ['contributors', 'viewers']) {
    if (!projects.fields.getByName(name)) {
      projects.fields.add(
        new Field({ name, type: 'relation', collectionId: users.id, maxSelect: 50 }),
      );
    }
  }
  projects.listRule = view('');
  projects.viewRule = view('');
  projects.createRule = `${TOTP_OK} && @request.body.owner = @request.auth.id && (@request.auth.is_admin = true || @request.auth.can_create_projects = true)`;
  projects.updateRule = `${TOTP_OK} && owner = @request.auth.id && @request.body.owner:isset = false`;
  projects.deleteRule = `${TOTP_OK} && owner = @request.auth.id`;
  app.save(projects);

  const templates = app.findCollectionByNameOrId('stage_templates');
  Object.assign(templates, editorRules('project.', ['project']));
  app.save(templates);

  const songs = app.findCollectionByNameOrId('songs');
  Object.assign(songs, editorRules('project.', ['project']));
  app.save(songs);

  // этапы: состав и порядок - редакторы; статус, срок и подэтапы - ещё и участники
  const stages = app.findCollectionByNameOrId('song_stages');
  const p = 'song.project.';
  stages.listRule = view(p);
  stages.viewRule = view(p);
  stages.createRule = edit(p);
  stages.updateRule = `${work(p)} && ${unset(['song'])} && (${editor(p)} || (${unset(['title', 'position'])}))`;
  stages.deleteRule = edit(p);
  app.save(stages);

  // заметки пишут участники и редакторы; правит и удаляет автор, удалить чужую может редактор
  const notes = app.findCollectionByNameOrId('notes');
  const n = 'project.';
  const sameProject =
    '(@request.body.song:isset = false || @request.body.song = "" || song.project = project) && (@request.body.stage:isset = false || @request.body.stage = "" || stage.song = song)';
  const onlyBecameSong = ['text', 'audio', 'images', 'author', 'project', 'song', 'stage']
    .map((f) => `@request.body.${f}:changed = false`)
    .join(' && ');
  notes.listRule = view(n);
  notes.viewRule = view(n);
  notes.createRule = `${work(n)} && @request.body.author = @request.auth.id && ${sameProject}`;
  notes.updateRule = `${work(n)} && ((author = @request.auth.id && ${unset(['author', 'project', 'song', 'stage'])}) || (${editor(n)} && ${onlyBecameSong}))`;
  notes.deleteRule = `${work(n)} && (author = @request.auth.id || ${editor(n)})`;
  app.save(notes);

  // кто уже работал в системе, проекты создавать может и дальше
  for (const u of app.findAllRecords('users')) {
    u.set('can_create_projects', true);
    app.saveNoValidate(u);
  }
}

migrate(apply, (app) => {
  const projects = app.findCollectionByNameOrId('projects');
  projects.fields.removeByName('contributors');
  projects.fields.removeByName('viewers');
  const editors = projects.fields.getByName('editors');
  if (editors) editors.name = 'members';
  app.save(projects);
});
