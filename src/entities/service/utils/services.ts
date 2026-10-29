// Сервисы для ссылок проекта и площадки публикаций. Значки - из открытого набора Simple
// Icons; знаков Яндекс Музыки, Звука и КИОН в нём нет - они из логотипов, присланных
// пользователем, приведены к тому же виду: один путь в поле 24x24. Без знака - плашка с буквой.
import {
  siYoutube,
  siInstagram,
  siTiktok,
  siApplemusic,
  siVk,
  siShazam,
  siSoundcloud,
  siDeezer,
  siSpotify,
} from 'simple-icons';
import type { ProjectLink, Project } from '@/entities/project';
import { getSafeUrl } from '@/shared/utils';
import {
  YANDEX_MUSIC,
  ZVUK,
  KION_MUSIC,
  WHITESPACE_RE,
  HTTP_PROTOCOL_RE,
  WWW_PREFIX_RE,
  TRAILING_SLASH_RE,
  OTHER_SERVICE,
} from '../constants/services';
import type { Service, LinkMeta } from '../types/services';

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
