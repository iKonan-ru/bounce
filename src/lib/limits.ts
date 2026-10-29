// пределы файлов - те же, что в схеме PocketBase
export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
// финальный WAV в блоке релиза: 24 бита и 96 кГц - это до 35 МБ в минуту
export const MAX_RELEASE_AUDIO_BYTES = 300 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILES = 5;
export const MAX_IMAGE_FILES = 10;
export const MAX_COVERS = 30;

// какие файлы предлагает выбрать диалог (атрибут accept); проверяет всё равно сервер
export const IMAGE_ACCEPT = 'image/*';
export const AUDIO_ACCEPT = 'audio/*';
// обложка для релиза - только JPEG (схема PocketBase, 1762100000_release.js)
export const RELEASE_COVER_ACCEPT = 'image/jpeg';
// финальный звук релиза: WAV или MP3 (1763300000_release_mp3.js)
export const RELEASE_AUDIO_ACCEPT = '.wav,.mp3,audio/wav,audio/x-wav,audio/wave,audio/mpeg';
