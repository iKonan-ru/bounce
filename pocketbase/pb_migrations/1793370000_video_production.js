/// <reference path="../pb_data/types.d.ts" />

// Видео имеет собственные карточки и этапы, правила ролей совпадают с музыкальными.
migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    const stages = app.findCollectionByNameOrId('song_stages');
    const videos = new Collection({
      type: 'base',
      name: 'videos',
      listRule: songs.listRule,
      viewRule: songs.viewRule,
      createRule: songs.createRule,
      updateRule: songs.updateRule,
      deleteRule: songs.deleteRule,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('projects').id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'title', type: 'text', required: true, max: 200 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['not_started', 'active', 'paused', 'done'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', max: 10000 },
        { name: 'script', type: 'text', max: 50000 },
        {
          name: 'aspect',
          type: 'select',
          values: ['16:9', '9:16', '1:1', '4:3'],
          maxSelect: 1,
        },
        {
          name: 'song',
          type: 'relation',
          collectionId: songs.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'materials', type: 'json', maxSize: 20000 },
        {
          name: 'preview',
          type: 'file',
          maxSelect: 1,
          maxSize: 20971520,
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/heic',
            'image/heif',
          ],
          protected: true,
          thumbs: ['96x96', '600x600'],
        },
        { name: 'position', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(videos);
    const videoStages = new Collection({
      type: 'base',
      name: 'video_stages',
      listRule: stages.listRule.replace(/song\./g, 'video.'),
      viewRule: stages.viewRule.replace(/song\./g, 'video.'),
      createRule: stages.createRule.replace(/song\./g, 'video.'),
      updateRule: stages.updateRule
        .replace(/song\./g, 'video.')
        .replace('body.song:', 'body.video:'),
      deleteRule: stages.deleteRule.replace(/song\./g, 'video.'),
      fields: [
        {
          name: 'video',
          type: 'relation',
          collectionId: videos.id,
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
    app.save(videoStages);
    const notes = app.findCollectionByNameOrId('notes');
    notes.fields.add(
      new Field({
        name: 'video',
        type: 'relation',
        collectionId: videos.id,
        maxSelect: 1,
        cascadeDelete: true,
      })
    );
    notes.fields.add(
      new Field({
        name: 'video_stage',
        type: 'relation',
        collectionId: videoStages.id,
        maxSelect: 1,
        cascadeDelete: true,
      })
    );
    notes.updateRule = notes.updateRule.replace(
      /@request.body.stage:changed = false/g,
      '@request.body.stage:changed = false && @request.body.video:changed = false && @request.body.video_stage:changed = false'
    );
    app.save(notes);
  },
  (app) => {
    const notes = app.findCollectionByNameOrId('notes');
    notes.updateRule = notes.updateRule.replace(
      / && @request.body.video:changed = false && @request.body.video_stage:changed = false/g,
      ''
    );
    notes.fields.removeByName('video');
    notes.fields.removeByName('video_stage');
    app.save(notes);
    app.delete(app.findCollectionByNameOrId('video_stages'));
    app.delete(app.findCollectionByNameOrId('videos'));
  }
);
