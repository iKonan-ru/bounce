// Пределы файлов - те же, что в схеме PocketBase.
import { BYTES_IN_MEGABYTE } from './format';

/** Аудио в заметке: не больше 200 МБ */
export const MAX_AUDIO_BYTES = 200 * BYTES_IN_MEGABYTE;

/** Финальная версия трека в блоке релиза: WAV 24 бита и 96 кГц - это до 35 МБ в минуту */
export const MAX_RELEASE_AUDIO_BYTES = 300 * BYTES_IN_MEGABYTE;

/** Картинка: не больше 20 МБ */
export const MAX_IMAGE_BYTES = 20 * BYTES_IN_MEGABYTE;

/** Аудиофайлов в одной заметке */
export const MAX_AUDIO_FILES = 5;

/** Картинок в одной заметке */
export const MAX_IMAGE_FILES = 10;

/** Обложек у песни */
export const MAX_COVERS = 30;

/** Картинки в диалоге выбора файла (атрибут accept); проверяет всё равно сервер */
export const IMAGE_ACCEPT = 'image/*';

/** Аудио в диалоге выбора файла */
export const AUDIO_ACCEPT = 'audio/*';

/** Обложка для релиза - только JPEG (схема PocketBase, 1762100000_release.js) */
export const RELEASE_COVER_ACCEPT = 'image/jpeg';

/** Финальный звук релиза: WAV или MP3 (1763300000_release_mp3.js) */
export const RELEASE_AUDIO_ACCEPT =
  '.wav,.mp3,audio/wav,audio/x-wav,audio/wave,audio/mpeg';
