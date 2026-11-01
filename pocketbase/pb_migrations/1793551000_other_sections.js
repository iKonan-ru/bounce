/// <reference path="../pb_data/types.d.ts" />

// Раздел "Другое": этапы и текстовые заметки без мультимедиа.
migrate(
  (app) => {
    const projects = app.findCollectionByNameOrId('projects');
    const directions = projects.fields.getByName('directions');
    directions.values = ['music', 'video', 'other'];
    directions.maxSelect = 3;
    app.save(projects);
    const stages = app.findCollectionByNameOrId('song_stages');
    const otherStages = new Collection({
      type: 'base',
      name: 'other_stages',
      listRule: stages.listRule.replace(/song\.project/g, 'project'),
      viewRule: stages.viewRule.replace(/song\.project/g, 'project'),
      createRule: stages.createRule.replace(/song\.project/g, 'project'),
      updateRule: stages.updateRule
        .replace(/song\.project/g, 'project')
        .replace('body.song:', 'body.project:'),
      deleteRule: stages.deleteRule.replace(/song\.project/g, 'project'),
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: projects.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'title', type: 'text', required: true, max: 120 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['not_started', 'in_progress', 'done', 'skipped'],
          maxSelect: 1,
        },
        { name: 'position', type: 'number', onlyInt: true, min: 0 },
        { name: 'deadline', type: 'date' },
        { name: 'substeps', type: 'json', maxSize: 20000 },
        {
          name: 'assignees',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('users').id,
          maxSelect: 20,
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(otherStages);
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.add(new Field({ name: 'other', type: 'bool' }));
    notes.fields.add(
      new Field({
        name: 'other_stage',
        type: 'relation',
        collectionId: otherStages.id,
        maxSelect: 1,
        cascadeDelete: true,
      })
    );
    notes.updateRule = notes.updateRule.replace(
      /@request.body.stage:changed = false/g,
      '@request.body.stage:changed = false && @request.body.other:changed = false && @request.body.other_stage:changed = false'
    );
    app.save(notes);
  },
  (app) => {
    if (
      app.findRecordsByFilter('projects', 'directions ?= "other"', '', 1)
        .length > 0
    ) {
      throw new Error('Сначала отключите раздел Другое в проектах.');
    }

    const notes = app.findCollectionByNameOrId('notes');
    notes.updateRule = notes.updateRule.replace(
      / && @request.body.other:changed = false && @request.body.other_stage:changed = false/g,
      ''
    );
    notes.fields.removeByName('other');
    notes.fields.removeByName('other_stage');
    app.save(notes);
    app.delete(app.findCollectionByNameOrId('other_stages'));
    const projects = app.findCollectionByNameOrId('projects');
    const directions = projects.fields.getByName('directions');
    directions.values = ['music', 'video'];
    directions.maxSelect = 2;
    app.save(projects);
  }
);
