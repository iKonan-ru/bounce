/// <reference path="../pb_data/types.d.ts" />

/** Личная заметка не связана с проектом и доступна только автору */
const PERSONAL =
  '@request.auth.id != "" && @request.auth.totp_enabled = true && @request.auth.disabled = false && project = "" && author = @request.auth.id';
/** Контекст личной заметки нельзя подменить при обновлении */
const LOCKED = [
  'project',
  'author',
  'song',
  'stage',
  'video',
  'video_stage',
  'became_song',
]
  .map((field) => `@request.body.${field}:changed = false`)
  .join(' && ');
/** Личная заметка не может ссылаться на материалы проекта */
const EMPTY_CONTEXT = ['song', 'stage', 'video', 'video_stage', 'became_song']
  .map((field) => `${field} = ""`)
  .join(' && ');

migrate(
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.getByName('project').required = false;
    for (const action of ['list', 'view', 'create', 'update', 'delete']) {
      const key = `${action}Rule`;
      let extra = '';

      if (action === 'create') {
        extra = ` && ${EMPTY_CONTEXT}`;
      }

      if (action === 'update') {
        extra = ` && ${LOCKED}`;
      }

      notes[key] = `(${notes[key]}) || (${PERSONAL}${extra})`;
    }
    app.save(notes);
  },
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    // Откат схемы не удаляет личные записи; их можно вернуть повторной миграцией.
    for (const action of ['list', 'view', 'create', 'update', 'delete']) {
      const key = `${action}Rule`;
      notes[key] = notes[key].slice(1, notes[key].indexOf(`) || (${PERSONAL}`));
    }
    app.save(notes);
  }
);
