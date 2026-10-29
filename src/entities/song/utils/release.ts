// Релиз песни: дата, отправка на лейбл и что для неё нужно.
import { JPEG_TYPE } from '@/shared/constants';
import { getImageSize, getIsoDayKey, getDayKey } from '@/shared/utils';
import { RELEASE_COVER_SIZE, RELEASE_REQUIREMENTS } from '../constants/release';
import type { ReleaseFields } from '../types/release';
import type { Song } from '../types/song';
import { SongStatus } from '../types/song';

/** Обложка для релиза: JPEG ровно 3000x3000. Возвращает причину отказа или null */
export async function getReleaseCoverProblem(
  file: File
): Promise<string | null> {
  if (file.type !== JPEG_TYPE) {
    return 'Нужен файл JPEG';
  }

  try {
    const { width, height } = await getImageSize(file);
    const isExactSize =
      width === RELEASE_COVER_SIZE && height === RELEASE_COVER_SIZE;

    if (!isExactSize) {
      return `Нужно ${RELEASE_COVER_SIZE}x${RELEASE_COVER_SIZE}, у этого файла ${width}x${height}`;
    }
  } catch {
    return 'Картинку не удалось прочитать';
  }

  return null;
}

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
