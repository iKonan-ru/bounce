import { RELEASE_COVER_SIZE } from './model';

// Размер картинки в браузере, без загрузки на сервер.
export async function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

// Обложка для релиза: JPEG ровно 3000x3000. Возвращает причину отказа или null.
export async function releaseCoverProblem(file: File): Promise<string | null> {
  if (file.type !== 'image/jpeg') return 'Нужен файл JPEG';
  try {
    const { width, height } = await imageSize(file);
    if (width !== RELEASE_COVER_SIZE || height !== RELEASE_COVER_SIZE) {
      return `Нужно ${RELEASE_COVER_SIZE}x${RELEASE_COVER_SIZE}, у этого файла ${width}x${height}`;
    }
  } catch {
    return 'Картинку не удалось прочитать';
  }
  return null;
}
