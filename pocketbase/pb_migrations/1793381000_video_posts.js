/// <reference path="../pb_data/types.d.ts" />

// Публикации видео независимы от музыкального релиза; карточка и план читают одну коллекцию.
migrate(
  (app) => {
    const posts = app.findCollectionByNameOrId('posts');
    const videos = app.findCollectionByNameOrId('videos');
    const timingFields = () => [
      { name: 'account', type: 'text', required: true, max: 15 },
      { name: 'timezone', type: 'text', max: 100 },
      {
        name: 'anchor',
        type: 'select',
        values: ['date', 'main'],
        maxSelect: 1,
      },
      { name: 'date', type: 'date' },
      {
        name: 'time',
        type: 'text',
        pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
      },
    ];
    const publication = new Collection({
      type: 'base',
      name: 'video_posts',
      listRule: posts.listRule,
      viewRule: posts.viewRule,
      createRule: posts.createRule,
      updateRule: `${posts.updateRule} && @request.body.video:changed = false && @request.body.source_template:changed = false`,
      deleteRule: posts.deleteRule,
      fields: [
        {
          name: 'project',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('projects').id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'video',
          type: 'relation',
          collectionId: videos.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'author',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('users').id,
          maxSelect: 1,
          required: true,
        },
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'text', type: 'text', max: 10000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['idea', 'preparing', 'ready', 'published'],
        },
        ...timingFields(),
        { name: 'offset', type: 'number', onlyInt: true, min: -365, max: 365 },
        {
          name: 'assignees',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('users').id,
          maxSelect: 1,
        },
        { name: 'url', type: 'url', onlyDomains: [] },
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
        { name: 'source_template', type: 'text', max: 15 },
        { name: 'scheduled_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_video_promo_source ON video_posts (video, source_template) WHERE source_template != ''",
      ],
    });
    app.save(publication);
    videos.fields.add(
      new Field({
        name: 'main_publication',
        type: 'relation',
        collectionId: publication.id,
        maxSelect: 1,
      })
    );
    app.save(videos);
    const templates = app.findCollectionByNameOrId('promo_templates');
    for (const field of timingFields()) {
      field.required = false;
      templates.fields.add(new Field(field));
    }
    app.save(templates);
  },
  (app) => {
    const videos = app.findCollectionByNameOrId('videos');
    videos.fields.removeByName('main_publication');
    app.save(videos);
    app.delete(app.findCollectionByNameOrId('video_posts'));
    const templates = app.findCollectionByNameOrId('promo_templates');
    for (const field of ['account', 'timezone', 'anchor', 'date', 'time']) {
      templates.fields.removeByName(field);
    }
    app.save(templates);
  }
);
