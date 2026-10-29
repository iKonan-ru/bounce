import type { ReleaseRequirement } from '../types/release';

/** Сторона обложки для релиза в точках: ровно 3000x3000 */
export const RELEASE_COVER_SIZE = 3000;

/** Что нужно для отправки на лейбл (так же проверяет сервер, pb_hooks/lib/release.js) */
export const RELEASE_REQUIREMENTS: readonly ReleaseRequirement[] = [
  { label: 'дата релиза', checkIsMet: (song) => Boolean(song.target_release) },
  {
    label: 'текст песни',
    checkIsMet: (song) => Boolean((song.lyrics ?? '').trim()),
  },
  {
    label: 'обложка для релиза',
    checkIsMet: (song) => Boolean(song.release_cover),
  },
];
