import type { VolumeState, PlayerState } from '../types/player';

/** Ключ громкости в localStorage */
export const VOLUME_KEY = 'bounce.volume';

/** Громкость по умолчанию: полная */
export const DEFAULT_VOLUME: VolumeState = { volume: 1, isMuted: false };

/** Пробная громкость: на iPhone и iPad браузер её не примет */
export const PROBE_VOLUME = 0.5;

/** Шаг перемотки кнопками системы, секунд */
export const SEEK_STEP_SECONDS = 10;

/** Размер обложки для системы */
export const ARTWORK_SIZE = '600x600';

/** Секунд в минуте */
export const SECONDS_IN_MINUTE = 60;

/** Записи MP3 - у них читаются теги */
export const MP3_RE = /\.mp3$/i;

/** Состояние без записи */
export const IDLE_STATE: Omit<PlayerState, keyof VolumeState> = {
  track: null,
  isPlaying: false,
  current: 0,
  duration: 0,
  isFailed: false,
  meta: undefined,
  saved: 0,
};
