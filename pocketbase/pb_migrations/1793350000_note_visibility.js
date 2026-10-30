/// <reference path="../pb_data/types.d.ts" />

/** Чтение заметки: общий доступ, автор или выбранный получатель */
const VISIBLE =
  '(visibility = "project" || author = @request.auth.id || (visibility = "selected" && recipients.id ?= @request.auth.id))';

/** Право менять работу в проекте */
const WORKER =
  '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id || project.contributors.id ?= @request.auth.id || project.commenters.id ?= @request.auth.id)';

/** Редактор проекта */
const EDITOR =
  '(project.owner = @request.auth.id || project.editors.id ?= @request.auth.id)';

/** Неизменяемые поля запроса */
function getUnchanged(fields) {
  return fields
    .map((field) => `@request.body.${field}:changed = false`)
    .join(' && ');
}

/** Прежнее правило обновления заметок для отката */
function getOldUpdateRule() {
  const own =
    'author = @request.auth.id && @request.body.author:isset = false && @request.body.project:isset = false && @request.body.song:isset = false && @request.body.stage:isset = false';
  const unchanged = getUnchanged([
    'text',
    'audio',
    'images',
    'author',
    'project',
    'song',
    'stage',
    'audio_names',
  ]);

  return `@request.auth.id != "" && @request.auth.totp_enabled = true && ${WORKER} && ((${own}) || (${EDITOR} && ${unchanged}))`;
}

migrate(
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.add(
      new Field({
        name: 'visibility',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['project', 'private', 'selected'],
      })
    );
    notes.fields.add(
      new Field({
        name: 'recipients',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('users').id,
        maxSelect: 50,
      })
    );
    const view = notes.viewRule;
    notes.listRule = `${view} && ${VISIBLE}`;
    notes.viewRule = notes.listRule;
    const content = getUnchanged([
      'text',
      'audio',
      'images',
      'audio_names',
      'song',
      'stage',
      'became_song',
    ]);
    const other = getUnchanged([
      'text',
      'audio',
      'images',
      'audio_names',
      'song',
      'stage',
      'visibility',
      'recipients',
    ]);
    notes.updateRule = `${view} && ${VISIBLE} && @request.body.author:isset = false && @request.body.project:isset = false && ((author = @request.auth.id && (${WORKER} || (${content}))) || (${EDITOR} && ${other}))`;
    notes.deleteRule = `${view} && ${VISIBLE} && ${WORKER} && (author = @request.auth.id || (visibility = "project" && ${EDITOR}))`;
    app.save(notes);
    app
      .db()
      .newQuery('UPDATE notes SET visibility = {:visibility}')
      .bind({ visibility: 'project' })
      .execute();
  },
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    notes.listRule = notes.listRule.replace(` && ${VISIBLE}`, '');
    notes.viewRule = notes.listRule;
    notes.updateRule = getOldUpdateRule();
    notes.deleteRule = `@request.auth.id != "" && @request.auth.totp_enabled = true && ${WORKER} && (author = @request.auth.id || ${EDITOR})`;
    notes.fields.removeByName('visibility');
    notes.fields.removeByName('recipients');
    app.save(notes);
  }
);
