/// <reference path="../pb_data/types.d.ts" />

// Идея проекта может стать песней: notes.became_song. Записи не переносятся между проектами и
// песнями, автор находки не меняется.

const LOCKS = {
  songs: ['project'],
  song_stages: ['song'],
  stage_templates: ['project'],
  findings: ['project', 'author'],
};

function lockRule(rule, fields) {
  return `${rule} && ${fields.map((f) => `@request.body.${f}:isset = false`).join(' && ')}`;
}

migrate(
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    const songs = app.findCollectionByNameOrId('songs');
    notes.fields.add(
      new Field({ name: 'became_song', type: 'relation', collectionId: songs.id, maxSelect: 1 }),
    );
    app.save(notes);

    for (const [name, fields] of Object.entries(LOCKS)) {
      const c = app.findCollectionByNameOrId(name);
      c.updateRule = lockRule(c.updateRule, fields);
      app.save(c);
    }
  },
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.removeByName('became_song');
    app.save(notes);

    for (const [name, fields] of Object.entries(LOCKS)) {
      const c = app.findCollectionByNameOrId(name);
      c.updateRule = c.updateRule.replace(
        ` && ${fields.map((f) => `@request.body.${f}:isset = false`).join(' && ')}`,
        '',
      );
      app.save(c);
    }
  },
);
