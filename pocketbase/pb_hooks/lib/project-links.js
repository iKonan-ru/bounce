/** Названия для старых клиентов, еще не отправляющих имя аккаунта */
const SERVICE_NAMES = {
  yandex_music: 'Яндекс Музыка',
  zvuk: 'Звук',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  apple_music: 'Apple Music',
  vk_music: 'VK Музыка',
  vk: 'ВКонтакте',
  shazam: 'Shazam',
  soundcloud: 'SoundCloud',
  deezer: 'Deezer',
  spotify: 'Spotify',
  kion_music: 'КИОН Музыка',
  other: 'Ссылка',
};

/** Проверка всего списка атомарно: одинаковые площадки разрешены, одинаковые имена в них - нет */
function validateLinks(event) {
  const record = event.record;
  const links = JSON.parse(record.getString('links') || '[]') || [];
  const previous =
    JSON.parse(record.original().getString('links') || '[]') || [];
  const enabled = record.getStringSlice('directions');

  if (enabled.length === 0) {
    enabled.push('music');
  }

  const names = {};
  const ids = {};

  if (!Array.isArray(links)) {
    throw new BadRequestError('Некорректный список ссылок.');
  }

  for (const link of links) {
    if (
      !link ||
      !Object.prototype.hasOwnProperty.call(SERVICE_NAMES, link.service)
    ) {
      throw new BadRequestError('Выберите площадку ссылки.');
    }

    const before = previous.find(
      (item) =>
        (link.id && item.id === link.id) ||
        (!link.id && item.service === link.service && item.url === link.url)
    );
    link.id =
      link.id ||
      (before && before.id) ||
      $security.randomString(15).toLowerCase();

    if (!/^[a-z0-9]{15}$/.test(link.id) || ids[link.id]) {
      throw new BadRequestError('Идентификаторы ссылок должны различаться.');
    }

    ids[link.id] = true;
    link.name = String(
      link.name === undefined
        ? (before && before.name) || SERVICE_NAMES[link.service]
        : link.name
    ).trim();

    if (!link.name || link.name.length > 40) {
      throw new BadRequestError(
        'Укажите уникальное название ссылки на этой площадке (до 40 символов).'
      );
    }

    if (
      typeof link.url !== 'string' ||
      !/^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(link.url)
    ) {
      throw new BadRequestError(
        'Укажите полный адрес ссылки с http:// или https://.'
      );
    }

    link.directions = link.directions ||
      (before && before.directions) || ['music'];

    if (
      !Array.isArray(link.directions) ||
      link.directions.length === 0 ||
      link.directions.some(
        (direction, index) =>
          enabled.indexOf(direction) < 0 ||
          link.directions.indexOf(direction) !== index
      )
    ) {
      throw new BadRequestError('Выберите включенные направления для ссылки.');
    }

    for (const direction of link.directions) {
      const key = `${direction}:${link.service}:${link.name.toLowerCase()}`;

      if (names[key]) {
        throw new BadRequestError(
          'Укажите уникальное название ссылки на этой площадке в выбранном направлении.'
        );
      }

      names[key] = true;
    }
  }
  record.set('links', links);
  require(`${__hooks}/lib/video-posts.js`).protectAccounts(event);
}

module.exports = { validateLinks };
