/// <reference path="../pb_data/types.d.ts" />

// Стабильные id ссылок и независимые шаблоны направлений без изменения старого наполнения.
migrate(
  (app) => {
    const names = {
      yandex_music: 'Яндекс Музыка',
      zvuk: 'Звук',
      youtube: 'YouTube',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      apple_music: 'Apple Music',
      vk_music: 'VK Музыка',
      shazam: 'Shazam',
      soundcloud: 'SoundCloud',
      deezer: 'Deezer',
      spotify: 'Spotify',
      kion_music: 'КИОН Музыка',
    };
    for (const project of app.findAllRecords('projects')) {
      const links = JSON.parse(project.getString('links') || '[]') || [];
      const used = {};
      for (const link of links) {
        const base = String(
          link.name || names[link.service] || link.service || 'Ссылка'
        )
          .trim()
          .slice(0, 36);
        let name = base;
        let index = 2;
        while (used[`${link.service}:${name.toLowerCase()}`]) {
          name = `${base} ${index++}`;
        }
        used[`${link.service}:${name.toLowerCase()}`] = true;
        link.id = $security.randomString(15).toLowerCase();
        link.name = name;
        link.directions = ['music'];
      }
      project.set('links', links);
      app.save(project);
    }
    for (const collectionName of ['stage_templates', 'promo_templates']) {
      const collection = app.findCollectionByNameOrId(collectionName);
      collection.fields.add(
        new Field({
          name: 'direction',
          type: 'select',
          values: ['music', 'video'],
          required: true,
        })
      );
      app.save(collection);
      app
        .db()
        .newQuery(`UPDATE ${collectionName} SET direction = {:direction}`)
        .bind({ direction: 'music' })
        .execute();
    }
  },
  (app) => {
    for (const collectionName of ['stage_templates', 'promo_templates']) {
      const collection = app.findCollectionByNameOrId(collectionName);
      collection.fields.removeByName('direction');
      app.save(collection);
    }
    // Дополнительные поля JSON не мешают старым клиентам; id сохраняются при откате.
  }
);
