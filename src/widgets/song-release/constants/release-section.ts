import type { ClearedReleaseAudio } from '../types/release-section';

/** Поле обложки для релиза */
export const RELEASE_COVER_FIELD = 'release_cover';

/** Добавление файла в галерею обложек песни */
export const COVERS_APPEND_FIELD = 'covers+';

/** Поле финальной версии трека */
export const RELEASE_AUDIO_FIELD = 'release_audio';

/** Поле исходного имени финальной версии */
export const RELEASE_AUDIO_NAME_FIELD = 'release_audio_name';

/** Наибольшая длина исходного имени финальной версии */
export const RELEASE_AUDIO_NAME_MAX = 300;

/** Уменьшенная копия обложки в галерее */
export const COVER_THUMB = '600x600';

/** Уменьшенная копия основной обложки в списках */
export const SMALL_COVER_THUMB = '96x96';

/** Процентов в целом */
export const PERCENT = 100;

/** Адрес bandlink: http(s) без пробелов */
export const BANDLINK_RE = /^https?:\/\/\S+$/;

/** Типы файлов WAV и MP3 */
export const RELEASE_AUDIO_TYPE_RE =
  /^audio\/(wav|x-wav|wave|vnd\.wave|mpeg|mp3)$/;

/** Расширения файлов WAV и MP3 */
export const RELEASE_AUDIO_EXTENSION_RE = /\.(wav|mp3)$/i;

/** Правка, которая убирает финальную версию трека */
export const CLEARED_RELEASE_AUDIO: ClearedReleaseAudio = {
  release_audio: null,
  release_audio_name: '',
};
