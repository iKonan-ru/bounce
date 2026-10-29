import { getDayKey, getIsoDayKey } from './format';
import { type Song, SongStatus } from './model';

// Релиз песни: дата, отправка на лейбл и что для неё нужно.

/** Сторона обложки для релиза в точках: ровно 3000x3000 */
export const RELEASE_COVER_SIZE = 3000;

/** Поля песни, которые нужны для отправки на лейбл */
interface ReleaseFields {
  lyrics?: string | undefined;
  release_cover?: string | undefined;
  target_release?: string | undefined;
}

/** Условие отправки на лейбл */
interface ReleaseRequirement {
  /** Чего не хватает - для подсказки */
  label: string;
  checkIsMet: (song: ReleaseFields) => boolean;
}

/** Что нужно для отправки на лейбл (так же проверяет сервер, pb_hooks/lib/release.js) */
const RELEASE_REQUIREMENTS: readonly ReleaseRequirement[] = [
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

/** День релиза наступил (по местному времени); дата хранится полднем UTC */
export function checkIsReleaseDue(
  iso: string | undefined,
  now = new Date()
): boolean {
  const day = getIsoDayKey(iso ?? '');

  if (!day) {
    return false;
  }

  return day <= getDayKey(now);
}

/** Статус для показа: сервер переводит отправленную песню в выпущенные раз в час, а здесь это видно сразу в день релиза */
export function getSongStatus(
  song: Pick<Song, 'status' | 'target_release'>
): SongStatus {
  const isReleasedToday =
    song.status === SongStatus.sent && checkIsReleaseDue(song.target_release);

  return isReleasedToday ? SongStatus.released : song.status;
}

/** Чего не хватает для отправки на лейбл */
export function getReleaseMissing(song: ReleaseFields): string[] {
  return RELEASE_REQUIREMENTS.filter(
    (requirement) => !requirement.checkIsMet(song)
  ).map((requirement) => requirement.label);
}
