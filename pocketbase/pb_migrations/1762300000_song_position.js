/// <reference path="../pb_data/types.d.ts" />

// Ручной порядок песен в проекте: список перетаскивают, позиция хранится в песне. Уже
// существующие песни встают по порядку создания, новые - сверху.

migrate(
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.fields.add(
      new Field({ name: 'position', type: 'number', onlyInt: true })
    );
    songs.addIndex(
      'idx_songs_project_position',
      false,
      'project, position',
      ''
    );
    app.save(songs);

    const positions = {};
    for (const song of app.findRecordsByFilter('songs', '', '-created', 0, 0)) {
      const project = song.getString('project');
      const next = positions[project] ?? 0;
      song.set('position', next);
      positions[project] = next + 1;
      app.saveNoValidate(song);
    }
  },
  (app) => {
    const songs = app.findCollectionByNameOrId('songs');
    songs.removeIndex('idx_songs_project_position');
    songs.fields.removeByName('position');
    app.save(songs);
  }
);
