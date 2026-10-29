import {
  siApplemusic,
  siDeezer,
  siInstagram,
  siShazam,
  siSoundcloud,
  siSpotify,
  siTiktok,
  siVk,
  siYoutube,
} from 'simple-icons';
import { getSafeUrl } from './markup';
import type { Project, ProjectLink } from './model';

// Сервисы для ссылок проекта и площадки публикаций. Значки - из открытого набора Simple
// Icons; знаков Яндекс Музыки, Звука и КИОН в нём нет - они из логотипов, присланных
// пользователем, приведены к тому же виду: один путь в поле 24x24. Без знака - плашка с буквой.

/** Знак сервиса: один путь SVG в поле 24x24 */
export interface Glyph {
  path: string;
}

/** Сервис ссылки или площадка публикации */
export interface Service {
  id: string;
  name: string;
  icon?: Glyph;
  letter?: string;
  /** Фирменный цвет знака; у сервисов без своего цвета (чёрный TikTok) - нет */
  color?: string;
  /** Фирменный градиент вместо цвета: от верхнего правого угла к нижнему левому */
  gradient?: readonly [string, string];
  /** Адреса сервиса: по ним вставленная ссылка сама находит свой сервис */
  domains?: readonly string[];
}

/** Знак Яндекс Музыки (не из набора, поле 24x24, знак вписан по центру) */
const YANDEX_MUSIC: Glyph = {
  path: 'M 23.27,9.273 l -0.094,-0.449 l -3.793,-0.658 l 2.205,-2.978 l -0.261,-0.282 l -3.239,1.557 l 0.408,-4.128 l -0.334,-0.188 l -1.975,3.333 L 13.991,0.505 l -0.387,0 l 0.522,4.807 L 8.557,0.85 l -0.47,0.136 l 4.295,5.392 L 3.886,3.546 l -0.387,0.428 l 7.587,4.316 L 0.615,9.168 l -0.115,0.648 l 10.878,1.181 L 2.308,18.5 l 0.387,0.522 l 10.795,-5.873 l -2.142,10.345 l 0.658,0 l 4.138,-9.729 l 2.518,7.618 l 0.449,-0.345 l -1.035,-7.743 l 3.929,4.462 l 0.261,-0.408 l -3.01,-5.528 l 4.201,1.557 l 0.042,-0.47 l -3.762,-2.78 l 3.553,-0.857 Z',
};

/** Знак Звука */
const ZVUK: Glyph = {
  path: 'M 3.797,1.105 c -1.275,0.723 -2.436,2.074 -2.931,3.388 c -0.381,1.009 -0.4,1.351 -0.343,7.727 l 0.057,6.68 l 0.533,0.952 c 0.761,1.37 1.96,2.55 3.178,3.121 l 1.047,0.495 l 6.851,0 l 6.851,0 l 1.009,-0.571 c 1.332,-0.723 2.588,-2.132 3.083,-3.464 c 0.381,-1.028 0.4,-1.351 0.343,-7.841 c -0.057,-6.661 -0.057,-6.794 -0.495,-7.594 c -0.647,-1.237 -1.846,-2.436 -2.95,-2.988 l -0.971,-0.476 l -7.137,0 l -7.156,0 l -0.971,0.571 z m 15.149,2.284 c 0.419,0.209 0.99,0.742 1.275,1.18 l 0.533,0.799 l 0.057,6.414 c 0.057,6.185 0.038,6.471 -0.343,7.213 c -0.381,0.761 -1.465,1.637 -2.189,1.751 c -0.305,0.038 -0.4,-0.095 -0.533,-0.704 c -0.552,-2.55 -0.799,-3.388 -1.446,-4.758 c -2.132,-4.51 -6.509,-7.955 -11.343,-8.945 c -0.837,-0.171 -1.599,-0.381 -1.675,-0.457 c -0.095,-0.095 0.019,-0.514 0.228,-0.933 c 0.381,-0.761 1.104,-1.389 1.941,-1.732 c 0.247,-0.095 3.216,-0.19 6.604,-0.19 c 5.805,-0.019 6.185,0 6.889,0.362 z m -14.14,5.614 c 4.13,0.971 7.784,4.149 9.363,8.126 c 0.647,1.675 1.047,3.388 0.818,3.616 c -0.095,0.095 -0.933,0.152 -1.846,0.114 l -1.675,-0.057 l -0.266,-1.104 c -0.666,-2.969 -3.673,-6.185 -6.604,-7.08 l -1.351,-0.419 l -0.057,-1.484 c -0.057,-1.503 0.019,-1.998 0.285,-1.998 c 0.076,0 0.685,0.133 1.332,0.285 z m 0.723,6.946 c 1.332,0.818 2.798,2.988 2.988,4.377 c 0.057,0.457 0.019,0.476 -1.275,0.533 c -1.618,0.057 -2.531,-0.381 -3.407,-1.637 c -0.495,-0.704 -0.59,-1.028 -0.647,-2.246 c -0.114,-1.96 -0.057,-2.036 0.933,-1.694 c 0.438,0.152 1.066,0.457 1.408,0.666 z',
};

/** Знак КИОН Музыки */
const KION_MUSIC: Glyph = {
  path: 'M 11.458,11.327 L 20.738,14.164 L 20.738,10.097 L 11.458,7.26 L 11.458,11.327 Z M 8.253,12.546 C 5.411,12.546 3.262,14.696 3.262,17.54 C 3.262,20.385 5.41,22.5 8.253,22.5 C 11.095,22.5 13.243,20.35 13.243,17.54 C 13.243,14.73 11.095,12.546 8.253,12.546 Z M 11.458,5.567 L 20.738,8.404 L 20.738,4.337 L 11.458,1.5 L 11.458,5.567 Z',
};

/** Цвет значка из Simple Icons */
function getBrandColor(icon: { hex: string }): string {
  return `#${icon.hex}`;
}

/** Музыкальные сервисы для ссылок проекта */
export const MUSIC_SERVICES: readonly Service[] = [
  {
    id: 'yandex_music',
    name: 'Яндекс Музыка',
    icon: YANDEX_MUSIC,
    color: '#FFBC0D',
    domains: [
      'music.yandex.ru',
      'music.yandex.com',
      'music.yandex.by',
      'music.yandex.kz',
    ],
  },
  {
    id: 'zvuk',
    name: 'Звук',
    icon: ZVUK,
    color: '#00D074',
    domains: ['zvuk.com', 'sber-zvuk.com'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: siYoutube,
    color: getBrandColor(siYoutube),
    domains: ['youtube.com', 'youtu.be'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: siInstagram,
    color: getBrandColor(siInstagram),
    domains: ['instagram.com'],
  },
  { id: 'tiktok', name: 'TikTok', icon: siTiktok, domains: ['tiktok.com'] },
  {
    id: 'apple_music',
    name: 'Apple Music',
    icon: siApplemusic,
    color: getBrandColor(siApplemusic),
    domains: ['music.apple.com'],
  },
  {
    id: 'vk_music',
    name: 'VK Музыка',
    icon: siVk,
    color: getBrandColor(siVk),
    domains: ['vk.com', 'vk.ru', 'boom.ru'],
  },
  {
    id: 'shazam',
    name: 'Shazam',
    icon: siShazam,
    color: getBrandColor(siShazam),
    domains: ['shazam.com'],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: siSoundcloud,
    color: getBrandColor(siSoundcloud),
    domains: ['soundcloud.com'],
  },
  {
    id: 'deezer',
    name: 'Deezer',
    icon: siDeezer,
    color: getBrandColor(siDeezer),
    domains: ['deezer.com', 'deezer.page.link'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: siSpotify,
    color: getBrandColor(siSpotify),
    domains: ['spotify.com', 'spotify.link'],
  },
  {
    id: 'kion_music',
    name: 'КИОН Музыка',
    icon: KION_MUSIC,
    gradient: ['#E4022D', '#5615A4'],
    domains: ['kion.ru'],
  },
];

/** "Другое": ссылка на сайт не из списка, со своим названием; таких может быть несколько */
export const OTHER_SERVICE: Service = { id: 'other', name: 'Другое' };

/** Предел длины своего названия ссылки */
export const OTHER_NAME_MAX = 40;

/** Площадки контент-плана */
export const POST_PLATFORMS: readonly Service[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: siInstagram,
    color: getBrandColor(siInstagram),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: siYoutube,
    color: getBrandColor(siYoutube),
  },
  { id: 'vk', name: 'ВКонтакте', icon: siVk, color: getBrandColor(siVk) },
  { id: 'tiktok', name: 'TikTok', icon: siTiktok },
];

/** Пробел внутри строки */
const WHITESPACE_RE = /\s/;

/** Адрес с протоколом http(s) */
const HTTP_PROTOCOL_RE = /^https?:\/\//i;

/** Начало домена www. */
const WWW_PREFIX_RE = /^www\./i;

/** Косая черта в конце адреса */
const TRAILING_SLASH_RE = /\/$/;

/** Ссылка, как её вставили: без https:// - дописываем. Не ссылка - null */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || WHITESPACE_RE.test(trimmed)) {
    return null;
  }

  const withProtocol = HTTP_PROTOCOL_RE.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);

    if (!parsed.hostname.includes('.')) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/** Адрес на домене сервиса или его поддомене */
function checkIsHostOfDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Сервис по адресу ссылки */
export function getServiceByUrl(
  list: readonly Service[],
  url: string
): Service | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(WWW_PREFIX_RE, '');
  } catch {
    return undefined;
  }

  return list.find((service) =>
    (service.domains ?? []).some((domain) => checkIsHostOfDomain(host, domain))
  );
}

/** Ссылка для глаз: без https:// и www, без / в конце */
export function getShortUrl(url: string): string {
  return url
    .replace(HTTP_PROTOCOL_RE, '')
    .replace(WWW_PREFIX_RE, '')
    .replace(TRAILING_SLASH_RE, '');
}

/** Сервис по id */
export function getServiceById(
  list: readonly Service[],
  id: string
): Service | undefined {
  return list.find((service) => service.id === id);
}

/** Сервис ссылки и подпись к ней */
export interface LinkMeta {
  service: Service;
  label: string;
}

/** Подпись "другой" ссылки: своё название, без него - адрес сайта */
function getOtherLinkLabel(link: ProjectLink): string {
  let host = '';
  try {
    host = new URL(link.url).hostname.replace(WWW_PREFIX_RE, '');
  } catch {
    host = getShortUrl(link.url);
  }

  return link.name?.trim() || host;
}

/** Сервис ссылки и подпись: у "другого" - своё название, без него - адрес сайта */
export function getLinkMeta(link: ProjectLink): LinkMeta | null {
  if (link.service === OTHER_SERVICE.id) {
    return { service: OTHER_SERVICE, label: getOtherLinkLabel(link) };
  }

  const service = getServiceById(MUSIC_SERVICES, link.service);

  if (!service) {
    return null;
  }

  return { service, label: service.name };
}

/** Ссылку можно показать: http(s) и с известным сервисом */
function checkIsShownLink(link: ProjectLink): boolean {
  if (!link.url) {
    return false;
  }

  if (!getSafeUrl(link.url)) {
    return false;
  }

  return getLinkMeta(link) !== null;
}

/**
 * Ссылки проекта для показа в том порядке, который задал владелец
 *
 * Только http(s) и с известным сервисом. Поле links - JSON, сервер его не проверяет, поэтому
 * javascript: и прочее, записанное в обход формы, не становится ссылкой
 */
export function getProjectLinks(
  project: Pick<Project, 'links'>
): ProjectLink[] {
  return (project.links ?? []).filter(checkIsShownLink);
}
