import {
  type SimpleIcon,
  siApplemusic,
  siDeezer,
  siInstagram,
  siShazam,
  siSoundcloud,
  siSpotify,
  siTelegram,
  siTiktok,
  siVk,
  siYoutube,
} from 'simple-icons';

// Сервисы для ссылок проекта и площадки публикаций. Значки - из открытого набора Simple
// Icons; для сервисов, которых в нём нет, - нейтральная плашка с первой буквой названия, без
// фирменных цветов и знаков.
export type Service = {
  id: string;
  name: string;
  icon?: SimpleIcon;
  letter?: string;
  // цвет знака сервиса (только для значков из набора)
  color?: string;
};

export const MUSIC_SERVICES: ReadonlyArray<Service> = [
  { id: 'yandex_music', name: 'Яндекс Музыка', letter: 'Я' },
  { id: 'zvuk', name: 'Звук', letter: 'З' },
  { id: 'youtube', name: 'YouTube', icon: siYoutube, color: `#${siYoutube.hex}` },
  { id: 'instagram', name: 'Instagram', icon: siInstagram, color: `#${siInstagram.hex}` },
  { id: 'tiktok', name: 'TikTok', icon: siTiktok },
  { id: 'apple_music', name: 'Apple Music', icon: siApplemusic, color: `#${siApplemusic.hex}` },
  { id: 'vk_music', name: 'VK Музыка', icon: siVk, color: `#${siVk.hex}` },
  { id: 'shazam', name: 'Shazam', icon: siShazam, color: `#${siShazam.hex}` },
  { id: 'soundcloud', name: 'SoundCloud', icon: siSoundcloud, color: `#${siSoundcloud.hex}` },
  { id: 'deezer', name: 'Deezer', icon: siDeezer, color: `#${siDeezer.hex}` },
  { id: 'spotify', name: 'Spotify', icon: siSpotify, color: `#${siSpotify.hex}` },
  { id: 'kion_music', name: 'КИОН Музыка', letter: 'К' },
];

// площадки контент-плана
export const POST_PLATFORMS: ReadonlyArray<Service> = [
  { id: 'instagram', name: 'Instagram', icon: siInstagram, color: `#${siInstagram.hex}` },
  { id: 'youtube', name: 'YouTube', icon: siYoutube, color: `#${siYoutube.hex}` },
  { id: 'vk', name: 'ВКонтакте', icon: siVk, color: `#${siVk.hex}` },
  { id: 'tiktok', name: 'TikTok', icon: siTiktok },
  { id: 'telegram', name: 'Telegram', icon: siTelegram, color: `#${siTelegram.hex}` },
];

export function serviceById(list: ReadonlyArray<Service>, id: string): Service | undefined {
  return list.find((s) => s.id === id);
}
