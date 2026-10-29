import { JPEG_TYPE } from '@/shared/constants';
import { getImageSize } from '@/shared/utils';
import { RELEASE_COVER_SIZE } from './release';

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
