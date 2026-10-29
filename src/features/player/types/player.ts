import type { FileRecord } from '@/shared/types';

/** Что играет - для системы (экран блокировки, центр управления, наушники) */
export interface AudioMeta {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  artwork?: string | undefined;
}

/** Закрытый файл записи */
export interface TrackFile {
  record: FileRecord;
  name: string;
}

/** Запись для плеера */
export interface Track {
  /** Одна и та же запись в разных местах - один ключ */
  key: string;
  name: string;
  /** Ссылка на закрытый файл собирается с новым файловым токеном при каждом запуске */
  file: TrackFile;
  meta?: AudioMeta | undefined;
  /** Сведения для системы - из тегов MP3, у остальных файлов - имя файла */
  shouldReadTags?: boolean | undefined;
  /** Откуда запустили: полоса внизу ведёт туда */
  origin?: string | undefined;
}

/** Громкость и выключенный звук; запоминаются на устройстве */
export interface VolumeState {
  /** Громкость 0..1 */
  volume: number;
  isMuted: boolean;
}

/** Состояние плеера */
export interface PlayerState extends VolumeState {
  track: Track | null;
  isPlaying: boolean;
  /** Сколько секунд проиграно */
  current: number;
  /** Длина записи в секундах */
  duration: number;
  isFailed: boolean;
  /** Сведения для системы, с учётом тегов */
  meta: AudioMeta | undefined;
  /** Сколько записи уже на устройстве (0..1, lib/audio-cache.ts): 1 - играет и без сети */
  saved: number;
}
